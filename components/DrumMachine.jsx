"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MELODY_NOTES,
  PADS,
  SOUNDS,
  SYNTH_WAVES,
  getCtx,
  startSynthNote,
} from "@/lib/synth";
import PresetsPanel from "@/components/PresetsPanel";
import CoachPanel from "@/components/CoachPanel";

const STEPS = 8;
const WHITE_KEY_INDICES = [0, 2, 4, 5, 7, 9, 11, 12];
const BLACK_KEYS = [
  { noteIndex: 1, afterWhite: 0 },
  { noteIndex: 3, afterWhite: 1 },
  { noteIndex: 6, afterWhite: 3 },
  { noteIndex: 8, afterWhite: 4 },
  { noteIndex: 10, afterWhite: 5 },
];
const KEYBOARD_TAGS = new Set(["input", "textarea", "select"]);

function emptyDrumGrid() {
  return PADS.map(() => Array(STEPS).fill(false));
}

function emptyMelodyGrid() {
  return MELODY_NOTES.map(() => Array(STEPS).fill(false));
}

export default function DrumMachine({ isAuthenticated = false }) {
  const [pulses, setPulses] = useState({});
  const [melodyPulses, setMelodyPulses] = useState({});
  const [grid, setGrid] = useState(emptyDrumGrid);
  const [melodyGrid, setMelodyGrid] = useState(emptyMelodyGrid);
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [currentStep, setCurrentStep] = useState(-1);
  const [synthWave, setSynthWave] = useState("sawtooth");
  const [recordArmed, setRecordArmed] = useState(false);
  const [recordStep, setRecordStep] = useState(0);
  const [activeNotes, setActiveNotes] = useState({});
  const gridRef = useRef(grid);
  const melodyGridRef = useRef(melodyGrid);
  const synthWaveRef = useRef(synthWave);
  const currentStepRef = useRef(-1);
  const stepRef = useRef(0);
  const timerRef = useRef(null);
  const liveNoteStopsRef = useRef({});

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    melodyGridRef.current = melodyGrid;
  }, [melodyGrid]);

  useEffect(() => {
    synthWaveRef.current = synthWave;
  }, [synthWave]);

  const flashPad = useCallback((padIndex, duration = 420) => {
    const id = Date.now() + Math.random() + padIndex;
    setPulses((p) => ({ ...p, [padIndex]: id }));
    setTimeout(() => {
      setPulses((p) => {
        if (p[padIndex] !== id) return p;
        const next = { ...p };
        delete next[padIndex];
        return next;
      });
    }, duration);
  }, []);

  const flashNote = useCallback((noteIndex, duration = 260) => {
    const id = Date.now() + Math.random() + noteIndex;
    setMelodyPulses((p) => ({ ...p, [noteIndex]: id }));
    setTimeout(() => {
      setMelodyPulses((p) => {
        if (p[noteIndex] !== id) return p;
        const next = { ...p };
        delete next[noteIndex];
        return next;
      });
    }, duration);
  }, []);

  const triggerPad = useCallback(
    (padIndex) => {
      const c = getCtx();
      if (!c) return;
      const pad = PADS[padIndex];
      SOUNDS[pad.id](c);
      flashPad(padIndex, 600);
    },
    [flashPad]
  );

  const toggleCell = (row, col) => {
    setGrid((g) => {
      const next = g.map((r) => r.slice());
      next[row][col] = !next[row][col];
      return next;
    });
  };

  const toggleMelodyCell = (row, col) => {
    setRecordStep(col);
    setMelodyGrid((g) => {
      const next = g.map((r) => r.slice());
      next[row][col] = !next[row][col];
      return next;
    });
  };

  const recordNoteAtStep = useCallback((noteIndex, step) => {
    setMelodyGrid((g) => {
      if (g[noteIndex][step]) return g;
      const next = g.map((r) => r.slice());
      next[noteIndex][step] = true;
      return next;
    });
  }, []);

  const recordSynthNote = useCallback(
    (noteIndex) => {
      const step =
        playing && currentStepRef.current >= 0 ? currentStepRef.current : recordStep;
      recordNoteAtStep(noteIndex, step);
      if (!playing) setRecordStep((s) => (s + 1) % STEPS);
    },
    [playing, recordNoteAtStep, recordStep]
  );

  const stopLiveNote = useCallback((noteId) => {
    const stop = liveNoteStopsRef.current[noteId];
    if (stop) {
      stop();
      delete liveNoteStopsRef.current[noteId];
    }
    setActiveNotes((notes) => {
      if (!notes[noteId]) return notes;
      const next = { ...notes };
      delete next[noteId];
      return next;
    });
  }, []);

  const startLiveNote = useCallback(
    (note, noteIndex) => {
      const c = getCtx();
      if (!c) return;

      stopLiveNote(note.id);
      liveNoteStopsRef.current[note.id] = startSynthNote(
        c,
        note.frequency,
        synthWaveRef.current,
        c.currentTime,
        { velocity: 0.88 }
      );
      flashNote(noteIndex, 360);
      setActiveNotes((notes) => ({ ...notes, [note.id]: true }));

      if (recordArmed) recordSynthNote(noteIndex);
    },
    [flashNote, recordArmed, recordSynthNote, stopLiveNote]
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      const tagName = event.target?.tagName?.toLowerCase();
      if (event.repeat || KEYBOARD_TAGS.has(tagName)) return;

      const noteIndex = MELODY_NOTES.findIndex(
        (note) => note.keyboardKey === event.key.toLowerCase()
      );
      if (noteIndex === -1) return;

      event.preventDefault();
      startLiveNote(MELODY_NOTES[noteIndex], noteIndex);
    };

    const handleKeyUp = (event) => {
      const note = MELODY_NOTES.find(
        (item) => item.keyboardKey === event.key.toLowerCase()
      );
      if (!note) return;
      event.preventDefault();
      stopLiveNote(note.id);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [startLiveNote, stopLiveNote]);

  useEffect(() => {
    return () => {
      Object.values(liveNoteStopsRef.current).forEach((stop) => stop());
      liveNoteStopsRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setCurrentStep(-1);
      currentStepRef.current = -1;
      stepRef.current = 0;
      return;
    }

    const interval = ((60 / bpm) * 1000) / 2;
    const noteDuration = Math.max(0.11, Math.min(0.42, (interval / 1000) * 0.82));

    const tick = () => {
      const step = stepRef.current % STEPS;
      currentStepRef.current = step;
      setCurrentStep(step);

      const c = getCtx();
      if (c) {
        gridRef.current.forEach((row, padIndex) => {
          if (row[step]) {
            SOUNDS[PADS[padIndex].id](c);
            flashPad(padIndex, 300);
          }
        });

        melodyGridRef.current.forEach((row, noteIndex) => {
          if (row[step]) {
            const note = MELODY_NOTES[noteIndex];
            startSynthNote(c, note.frequency, synthWaveRef.current, c.currentTime, {
              duration: noteDuration,
              velocity: 0.72,
            });
            flashNote(noteIndex, 280);
          }
        });
      }

      stepRef.current += 1;
    };

    tick();
    timerRef.current = setInterval(tick, interval);
    return () => clearInterval(timerRef.current);
  }, [playing, bpm, flashPad, flashNote]);

  const clearGrid = () => {
    setGrid(emptyDrumGrid());
    setMelodyGrid(emptyMelodyGrid());
    setRecordStep(0);
  };

  const getCurrentState = useCallback(
    () => ({
      bpm,
      grid: gridRef.current,
      melodyGrid: melodyGridRef.current,
      synthWave: synthWaveRef.current,
    }),
    [bpm]
  );

  // Apply a loaded preset. Defensively coerce shapes so a malformed row can't crash playback.
  const applyPreset = useCallback((preset) => {
    setPlaying(false);
    if (typeof preset.bpm === "number") setBpm(preset.bpm);
    if (Array.isArray(preset.grid) && preset.grid.length === PADS.length) {
      setGrid(preset.grid.map((r) => r.slice()));
    }
    if (
      Array.isArray(preset.melodyGrid) &&
      preset.melodyGrid.length === MELODY_NOTES.length
    ) {
      setMelodyGrid(preset.melodyGrid.map((r) => r.slice()));
    }
    if (SYNTH_WAVES.some((w) => w.id === preset.synthWave)) {
      setSynthWave(preset.synthWave);
    }
    setRecordStep(0);
  }, []);

  const displayStep = playing && currentStep >= 0 ? currentStep : recordStep;
  const melodyRows = MELODY_NOTES.map((note, noteIndex) => ({
    note,
    noteIndex,
  })).reverse();

  return (
    <div className="min-h-screen w-full px-4 py-8 sm:px-8 flex flex-col items-center gap-8">
      <header className="text-center">
        <h1 className="text-4xl sm:text-5xl font-black tracking-widest bg-gradient-to-r from-fuchsia-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(236,72,153,0.4)]">
          NEON BEAT SYNTH
        </h1>
        <p className="mt-2 text-sm uppercase tracking-[0.3em] text-white/50">
          tap pads. play keys. sequence heat.
        </p>
      </header>

      {isAuthenticated && (
        <>
          <PresetsPanel
            getCurrentState={getCurrentState}
            applyPreset={applyPreset}
          />
          <CoachPanel getCurrentState={getCurrentState} />
        </>
      )}

      <section className="grid grid-cols-4 gap-4 w-full max-w-2xl">
        {PADS.map((pad, i) => {
          const active = pulses[i] !== undefined;
          return (
            <button
              key={pad.id}
              onClick={() => triggerPad(i)}
              className={`relative aspect-square rounded-2xl bg-gradient-to-br ${pad.color} shadow-lg overflow-hidden transition-transform active:scale-95 ${active ? "animate-glow" : ""}`}
              style={{
                boxShadow: active
                  ? `0 0 35px ${pad.glow}, 0 0 12px ${pad.glow} inset`
                  : `0 0 18px ${pad.glow.replace("0.7", "0.35")}`,
              }}
            >
              <span className="absolute inset-0 flex items-center justify-center font-bold text-white/95 tracking-wider drop-shadow text-sm sm:text-base">
                {pad.label}
              </span>
              {active && (
                <span
                  key={pulses[i]}
                  className="pointer-events-none absolute inset-0 m-auto h-16 w-16 rounded-full bg-white/40 animate-ripple"
                />
              )}
            </button>
          );
        })}
      </section>

      <section className="w-full max-w-5xl rounded-2xl border border-cyan-300/15 bg-black/50 backdrop-blur p-4 sm:p-6 shadow-[0_0_36px_rgba(34,211,238,0.08)]">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="mr-auto">
            <h2 className="text-sm font-black uppercase tracking-[0.32em] text-cyan-200">
              Melody Synth
            </h2>
            <div className="mt-1 h-px w-28 bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-transparent" />
          </div>

          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
            {SYNTH_WAVES.map((wave) => {
              const active = synthWave === wave.id;
              return (
                <button
                  key={wave.id}
                  onClick={() => setSynthWave(wave.id)}
                  className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition ${
                    active
                      ? "bg-cyan-300 text-black shadow-[0_0_18px_rgba(34,211,238,0.6)]"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                  aria-pressed={active}
                >
                  {wave.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setRecordArmed((armed) => !armed)}
            className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-[0.24em] transition ${
              recordArmed
                ? "bg-rose-500 text-white shadow-[0_0_22px_rgba(244,63,94,0.65)]"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
            aria-pressed={recordArmed}
          >
            {recordArmed ? "Rec On" : "Rec"}
          </button>

          <div className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-400/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-fuchsia-100">
            Step {displayStep + 1}
          </div>
        </div>

        <div className="relative h-44 select-none touch-none overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-cyan-300/10 via-white/5 to-fuchsia-400/10 p-2 sm:h-52">
          <div className="grid h-full grid-cols-8 gap-1">
            {WHITE_KEY_INDICES.map((noteIndex) => {
              const note = MELODY_NOTES[noteIndex];
              const active = activeNotes[note.id] || melodyPulses[noteIndex];
              return (
                <button
                  key={note.id}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                    startLiveNote(note, noteIndex);
                  }}
                  onPointerUp={(event) => {
                    event.preventDefault();
                    stopLiveNote(note.id);
                  }}
                  onPointerCancel={() => stopLiveNote(note.id)}
                  onPointerLeave={(event) => {
                    if (event.buttons > 0) stopLiveNote(note.id);
                  }}
                  className={`relative h-full rounded-b-xl border border-cyan-200/25 bg-gradient-to-b from-white via-cyan-100 to-slate-200 text-slate-950 shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition active:translate-y-1 ${
                    active ? "translate-y-1 ring-2 ring-cyan-300" : "hover:-translate-y-0.5"
                  }`}
                  style={{
                    boxShadow: active
                      ? "0 0 30px rgba(34,211,238,0.75), inset 0 -12px 24px rgba(217,70,239,0.24)"
                      : undefined,
                  }}
                  aria-label={`${note.id} key`}
                >
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-sm font-black tracking-widest">
                    {note.label}
                    <span className="ml-1 text-[10px] text-slate-500">{note.octave}</span>
                  </span>
                  <span className="absolute left-1/2 top-3 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {note.keyboardKey}
                  </span>
                </button>
              );
            })}
          </div>

          {BLACK_KEYS.map(({ noteIndex, afterWhite }) => {
            const note = MELODY_NOTES[noteIndex];
            const active = activeNotes[note.id] || melodyPulses[noteIndex];
            const keyWidth = 8;
            const left = ((afterWhite + 1) / WHITE_KEY_INDICES.length) * 100 - keyWidth / 2;

            return (
              <button
                key={note.id}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                  startLiveNote(note, noteIndex);
                }}
                onPointerUp={(event) => {
                  event.preventDefault();
                  stopLiveNote(note.id);
                }}
                onPointerCancel={() => stopLiveNote(note.id)}
                onPointerLeave={(event) => {
                  if (event.buttons > 0) stopLiveNote(note.id);
                }}
                className={`absolute top-2 z-10 h-[61%] rounded-b-lg border border-fuchsia-300/25 bg-gradient-to-b from-zinc-800 via-black to-zinc-950 text-white shadow-[0_12px_28px_rgba(0,0,0,0.55)] transition active:translate-y-1 ${
                  active ? "translate-y-1 ring-2 ring-fuchsia-300" : "hover:-translate-y-0.5"
                }`}
                style={{
                  left: `${left}%`,
                  width: `${keyWidth}%`,
                  boxShadow: active
                    ? "0 0 30px rgba(217,70,239,0.78), inset 0 -10px 18px rgba(34,211,238,0.18)"
                    : undefined,
                }}
                aria-label={`${note.id} key`}
              >
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-black tracking-widest">
                  {note.label}
                </span>
                <span className="absolute left-1/2 top-3 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-white/40">
                  {note.keyboardKey}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="w-full max-w-5xl rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            onClick={() => setPlaying((p) => !p)}
            className={`px-5 py-2 rounded-lg font-bold tracking-wider uppercase transition ${
              playing
                ? "bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)]"
                : "bg-cyan-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.6)]"
            }`}
          >
            {playing ? "Stop" : "Play"}
          </button>
          <button
            onClick={clearGrid}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm uppercase tracking-wider"
          >
            Clear
          </button>
          <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/70 ml-auto">
            BPM
            <input
              type="range"
              min="60"
              max="200"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="accent-fuchsia-500"
            />
            <span className="font-mono text-cyan-300 w-10 text-right">{bpm}</span>
          </label>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid" style={{ gridTemplateColumns: `96px repeat(${STEPS}, 1fr)` }}>
              <div />
              {Array.from({ length: STEPS }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setRecordStep(i)}
                  className={`pb-2 text-center text-[10px] font-bold uppercase tracking-widest transition ${
                    currentStep === i
                      ? "text-cyan-300"
                      : recordStep === i
                        ? "text-fuchsia-300"
                        : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {PADS.map((pad, row) => (
              <div
                key={pad.id}
                className="grid items-center gap-1 py-1"
                style={{ gridTemplateColumns: `96px repeat(${STEPS}, 1fr)` }}
              >
                <div className="text-[11px] font-bold uppercase tracking-widest text-white/70 pr-2 text-right">
                  {pad.label}
                </div>
                {grid[row].map((on, col) => {
                  const isCurrent = currentStep === col;
                  return (
                    <button
                      key={col}
                      onClick={() => toggleCell(row, col)}
                      className={`h-7 sm:h-8 rounded-md transition-all border ${
                        on
                          ? `bg-gradient-to-br ${pad.color} border-white/30`
                          : "bg-white/5 hover:bg-white/10 border-white/10"
                      } ${isCurrent ? "ring-2 ring-cyan-300/80" : ""}`}
                      style={{
                        boxShadow: on ? `0 0 12px ${pad.glow}` : undefined,
                      }}
                      aria-pressed={on}
                    />
                  );
                })}
              </div>
            ))}

            <div className="my-3 grid" style={{ gridTemplateColumns: `96px 1fr` }}>
              <div className="text-[10px] font-black uppercase tracking-[0.26em] text-fuchsia-200/80 pr-2 text-right">
                Synth
              </div>
              <div className="h-px self-center bg-gradient-to-r from-fuchsia-300/50 via-cyan-300/30 to-transparent" />
            </div>

            {melodyRows.map(({ note, noteIndex }) => (
              <div
                key={note.id}
                className="grid items-center gap-1 py-1"
                style={{ gridTemplateColumns: `96px repeat(${STEPS}, 1fr)` }}
              >
                <div
                  className={`pr-2 text-right text-[11px] font-bold uppercase tracking-widest ${
                    note.isSharp ? "text-fuchsia-200/80" : "text-cyan-100/80"
                  }`}
                >
                  {note.id}
                </div>
                {melodyGrid[noteIndex].map((on, col) => {
                  const isCurrent = currentStep === col;
                  const isTarget = !playing && recordStep === col;
                  const isLive = melodyPulses[noteIndex] !== undefined;
                  return (
                    <button
                      key={col}
                      onClick={() => toggleMelodyCell(noteIndex, col)}
                      className={`h-6 rounded-md border transition-all sm:h-7 ${
                        on
                          ? "border-cyan-100/40 bg-gradient-to-br from-cyan-300 to-fuchsia-500"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      } ${isCurrent ? "ring-2 ring-cyan-300/80" : ""} ${
                        isTarget ? "outline outline-1 outline-fuchsia-300/70" : ""
                      }`}
                      style={{
                        boxShadow:
                          on || isLive
                            ? "0 0 14px rgba(34,211,238,0.48), 0 0 20px rgba(217,70,239,0.24)"
                            : undefined,
                      }}
                      aria-pressed={on}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="text-[11px] uppercase tracking-[0.3em] text-white/30 pb-4">
        Web Audio API · oscillators only · no files
      </footer>
    </div>
  );
}
