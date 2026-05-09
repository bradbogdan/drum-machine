"use server";

import { PADS, MELODY_NOTES } from "@/lib/synth";
import { serializeState } from "@/lib/coach/serialize";
import { buildMessages } from "@/lib/coach/prompt";
import { createClient } from "@/lib/supabase/server";

const STEPS = 8;
const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6";
const MAX_OUTPUT_TOKENS = 500;

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
