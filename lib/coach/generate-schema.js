import { MELODY_NOTES, PADS, SYNTH_WAVES } from "@/lib/synth";

// Tool the model must call when generating a beat. Strict shape: any deviation
// (wrong array length, non-boolean cell, unknown synth wave) is rejected by the
// server-side validator before the grid is touched.

const STEPS = 8;

export const APPLY_PATTERN_TOOL = {
  type: "function",
  function: {
    name: "apply_pattern",
    description:
      "Apply a generated 8-step beat pattern to the user's drum machine. Use this for every beat-generation request.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["bpm", "synth_wave", "drum_grid", "melody_grid", "note"],
      properties: {
        bpm: {
          type: "integer",
          minimum: 60,
          maximum: 200,
          description: "Tempo in BPM, between 60 and 200.",
        },
        synth_wave: {
          type: "string",
          enum: SYNTH_WAVES.map((w) => w.id),
          description: `One of: ${SYNTH_WAVES.map((w) => w.id).join(", ")}.`,
        },
        drum_grid: {
          type: "array",
          minItems: PADS.length,
          maxItems: PADS.length,
          description: `Exactly ${PADS.length} rows, one per pad in this order: ${PADS.map((p) => p.id).join(", ")}. Each row is exactly ${STEPS} booleans (true = hit on that step).`,
          items: {
            type: "array",
            minItems: STEPS,
            maxItems: STEPS,
            items: { type: "boolean" },
          },
        },
        melody_grid: {
          type: "array",
          minItems: MELODY_NOTES.length,
          maxItems: MELODY_NOTES.length,
          description: `Exactly ${MELODY_NOTES.length} rows, one per note from low to high: ${MELODY_NOTES.map((n) => n.id).join(", ")}. Each row is exactly ${STEPS} booleans.`,
          items: {
            type: "array",
            minItems: STEPS,
            maxItems: STEPS,
            items: { type: "boolean" },
          },
        },
        note: {
          type: "string",
          maxLength: 500,
          description:
            "One short producer-voice line about the choices made (under 500 chars). If the request was non-musical or could not be honoured, explain that here in one sentence and return the user's existing pattern unchanged.",
        },
      },
    },
  },
};

// Validate the tool-call args coming back from the model. Throws a user-safe
// Error on any deviation. Returns the normalized state in DrumMachine shape.
export function validateGeneratedPattern(args) {
  if (!args || typeof args !== "object") {
    throw new Error("Coach returned an invalid response");
  }

  const { bpm, synth_wave, drum_grid, melody_grid, note } = args;

  if (!Number.isInteger(bpm) || bpm < 60 || bpm > 200) {
    throw new Error("Coach returned an invalid BPM");
  }

  const allowedWaves = new Set(SYNTH_WAVES.map((w) => w.id));
  if (typeof synth_wave !== "string" || !allowedWaves.has(synth_wave)) {
    throw new Error("Coach returned an invalid synth wave");
  }

  if (!Array.isArray(drum_grid) || drum_grid.length !== PADS.length) {
    throw new Error("Coach returned a wrong-shaped drum grid");
  }
  for (const row of drum_grid) {
    if (!Array.isArray(row) || row.length !== STEPS) {
      throw new Error("Coach returned a wrong-shaped drum row");
    }
    for (const cell of row) {
      if (typeof cell !== "boolean") throw new Error("Coach returned a non-boolean drum cell");
    }
  }

  if (!Array.isArray(melody_grid) || melody_grid.length !== MELODY_NOTES.length) {
    throw new Error("Coach returned a wrong-shaped melody grid");
  }
  for (const row of melody_grid) {
    if (!Array.isArray(row) || row.length !== STEPS) {
      throw new Error("Coach returned a wrong-shaped melody row");
    }
    for (const cell of row) {
      if (typeof cell !== "boolean") throw new Error("Coach returned a non-boolean melody cell");
    }
  }

  if (typeof note !== "string" || note.length > 500) {
    throw new Error("Coach returned an invalid note");
  }

  return {
    bpm,
    synthWave: synth_wave,
    grid: drum_grid,
    melodyGrid: melody_grid,
    note,
  };
}
