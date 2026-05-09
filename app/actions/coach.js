"use server";

import { PADS, MELODY_NOTES } from "@/lib/synth";
import { serializeState } from "@/lib/coach/serialize";
import { buildMessages, buildGenerateMessages } from "@/lib/coach/prompt";
import { APPLY_PATTERN_TOOL, validateGeneratedPattern } from "@/lib/coach/generate-schema";
import { createClient } from "@/lib/supabase/server";

const STEPS = 8;
const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6";
const MAX_OUTPUT_TOKENS = 500;
const MAX_GENERATE_TOKENS = 1500;
const MAX_PROMPT_LENGTH = 500;

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to ask the coach");
  return user;
}

// Validate the payload shape so a malformed client can't crash the server action
// or feed garbage to the model. Throws with a user-safe message.
function validateState(state) {
  if (!state || typeof state !== "object") {
    throw new Error("Invalid state");
  }
  const { bpm, grid, melodyGrid, synthWave } = state;

  if (typeof bpm !== "number" || !Number.isFinite(bpm) || bpm < 60 || bpm > 200) {
    throw new Error("Invalid BPM");
  }
  if (typeof synthWave !== "string" || synthWave.length > 20) {
    throw new Error("Invalid synth wave");
  }
  if (!Array.isArray(grid) || grid.length !== PADS.length) {
    throw new Error("Invalid drum grid shape");
  }
  if (!Array.isArray(melodyGrid) || melodyGrid.length !== MELODY_NOTES.length) {
    throw new Error("Invalid melody grid shape");
  }
  for (const row of grid) {
    if (!Array.isArray(row) || row.length !== STEPS) throw new Error("Invalid drum row");
    for (const cell of row) if (typeof cell !== "boolean") throw new Error("Invalid drum cell");
  }
  for (const row of melodyGrid) {
    if (!Array.isArray(row) || row.length !== STEPS) throw new Error("Invalid melody row");
    for (const cell of row) if (typeof cell !== "boolean") throw new Error("Invalid melody cell");
  }

  return { bpm, grid, melodyGrid, synthWave };
}

export async function getCoachFeedback(state) {
  await requireUser();
  const safe = validateState(state);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    // Loud, unmistakable error so a misconfigured deploy is obvious in logs,
    // but the message returned to the client stays user-safe (no key info).
    console.error("[coach] OPENROUTER_API_KEY is not set");
    throw new Error("Coach is not configured on the server");
  }
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  const { text, isEmpty } = serializeState(safe);

  // Cheap shortcut: skip the network call when there is nothing to critique.
  if (isEmpty) {
    return { feedback: "There is nothing here yet, lay something down first.", model: null };
  }

  const messages = buildMessages(text);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[coach] OpenRouter error", response.status, detail.slice(0, 500));
    throw new Error("Coach is offline, try again in a moment");
  }

  const data = await response.json();
  const feedback = data?.choices?.[0]?.message?.content?.trim();
  if (!feedback) {
    console.error("[coach] Empty feedback from OpenRouter", JSON.stringify(data).slice(0, 500));
    throw new Error("Coach gave an empty answer, try again");
  }

  return { feedback, model };
}

// Generation: takes a free-text prompt + the current state (for iterative
// refinement), asks the model to call the apply_pattern tool, validates the
// args, and returns a pattern in DrumMachine shape plus a short producer note.
export async function generateBeat({ prompt, state }) {
  await requireUser();

  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("Tell the coach what you want first");
  }
  const trimmedPrompt = prompt.trim().slice(0, MAX_PROMPT_LENGTH);

  const safe = validateState(state);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("[coach] OPENROUTER_API_KEY is not set");
    throw new Error("Coach is not configured on the server");
  }
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  const { text } = serializeState(safe);
  const messages = buildGenerateMessages(text, trimmedPrompt);

  const body = {
    model,
    messages,
    max_tokens: MAX_GENERATE_TOKENS,
    temperature: 0.85,
    tools: [APPLY_PATTERN_TOOL],
    tool_choice: { type: "function", function: { name: "apply_pattern" } },
  };

  // One retry on 5xx / network glitches; never on 4xx.
  let response;
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (response.ok) break;
      if (response.status < 500) break;
      lastError = `status ${response.status}`;
    } catch (err) {
      lastError = err?.message;
    }
  }

  if (!response || !response.ok) {
    const detail = response ? await response.text().catch(() => "") : lastError;
    console.error("[coach.generate] OpenRouter error", response?.status, String(detail).slice(0, 500));
    throw new Error("Coach is offline, try again in a moment");
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message;
  const toolCalls = message?.tool_calls;
  const firstCall = Array.isArray(toolCalls) && toolCalls[0];

  if (!firstCall || firstCall?.function?.name !== "apply_pattern") {
    // Some refusals come back as plain text instead of a tool call. Surface
    // that text so the user sees the producer's reason rather than a generic
    // error.
    const refusal = typeof message?.content === "string" ? message.content.trim() : "";
    console.error("[coach.generate] missing tool_call", JSON.stringify(data).slice(0, 500));
    if (refusal) throw new Error(refusal.slice(0, 300));
    throw new Error("Coach didn't compose a pattern, try rephrasing");
  }

  let args;
  try {
    args = JSON.parse(firstCall.function.arguments);
  } catch (err) {
    console.error("[coach.generate] tool args not JSON", firstCall.function.arguments?.slice(0, 200));
    throw new Error("Coach returned malformed output, try again");
  }

  const pattern = validateGeneratedPattern(args);
  return { pattern, model };
}
