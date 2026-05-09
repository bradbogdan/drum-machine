import { MELODY_NOTES, PADS } from "@/lib/synth";

// Render the live drum-machine state into a compact, human-readable text block
// the model can reason about. Format mirrors a step-sequencer printout:
//   Kick    X . . . X . . .
//   Snare   . . X . . . X .
// Empty rows are dropped to keep the prompt short.

const STEPS = 8;

function rowToString(row) {
  return row.map((on) => (on ? "X" : ".")).join(" ");
}

function rowHasHits(row) {
  return Array.isArray(row) && row.some(Boolean);
}

function padLabel(label, width) {
  return label.padEnd(width, " ");
}

export function serializeState({ bpm, grid, melodyGrid, synthWave }) {
  const drumLines = [];
  const drumWidth = 7;

  PADS.forEach((pad, i) => {
    const row = grid?.[i];
    if (!rowHasHits(row)) return;
    drumLines.push(`  ${padLabel(pad.label, drumWidth)} ${rowToString(row)}`);
  });

  const melodyLines = [];
  const noteWidth = 4;
  MELODY_NOTES.forEach((note, i) => {
    const row = melodyGrid?.[i];
    if (!rowHasHits(row)) return;
    melodyLines.push(`  ${padLabel(note.id, noteWidth)} ${rowToString(row)}`);
  });

  const totalDrumHits = drumLines.length;
  const totalMelodyHits = melodyLines.length;
  const isEmpty = totalDrumHits === 0 && totalMelodyHits === 0;

  const parts = [
    `BPM: ${bpm}`,
    `Synth wave: ${synthWave}`,
    `Grid: ${STEPS} steps (eighth notes at the displayed BPM)`,
  ];

  if (isEmpty) {
    parts.push("Drums: (empty)");
    parts.push("Melody: (empty)");
  } else {
    parts.push("");
    parts.push("Drums (X = hit, . = rest):");
    parts.push(drumLines.length ? drumLines.join("\n") : "  (no drum hits)");
    parts.push("");
    parts.push("Melody (X = hit):");
    parts.push(melodyLines.length ? melodyLines.join("\n") : "  (no melody notes)");
  }

  return { text: parts.join("\n"), isEmpty };
}
