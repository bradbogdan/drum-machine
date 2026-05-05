"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PADS, SOUNDS, getCtx } from "@/lib/synth";

const STEPS = 8;

export default function DrumMachine() {
  const [pulses, setPulses] = useState({});
  const [grid, setGrid] = useState(() =>
    PADS.map(() => Array(STEPS).fill(false))
  );
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [currentStep, setCurrentStep] = useState(-1);
  const stepRef = useRef(0);
  const timerRef = useRef(null);

  const triggerPad = useCallback((padIndex) => {
    const c = getCtx();
    if (!c) return;
    const pad = PADS[padIndex];
    SOUNDS[pad.id](c);
    const id = Date.now() + Math.random();
    setPulses((p) => ({ ...p, [padIndex]: id }));
    setTimeout(() => {
      setPulses((p) => {
        if (p[padIndex] !== id) return p;
        const next = { ...p };
        delete next[padIndex];
        return next;
      });
    }, 600);
  }, []);

  const toggleCell = (row, col) => {
    setGrid((g) => {
      const next = g.map((r) => r.slice());
      next[row][col] = !next[row][col];
      return next;
    });
  };

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setCurrentStep(-1);
      stepRef.current = 0;
      return;
    }
    const interval = (60 / bpm) * 1000 / 2;
    const tick = () => {
      const step = stepRef.current % STEPS;
      setCurrentStep(step);
      const c = getCtx();
      if (c) {
        grid.forEach((row, padIndex) => {
          if (row[step]) {
            SOUNDS[PADS[padIndex].id](c);
            const id = Date.now() + Math.random() + padIndex;
            setPulses((p) => ({ ...p, [padIndex]: id }));
            setTimeout(() => {
              setPulses((p) => {
                if (p[padIndex] !== id) return p;
                const next = { ...p };
                delete next[padIndex];
                return next;
              });
            }, 300);
          }
        });
      }
      stepRef.current += 1;
    };
    tick();
    timerRef.current = setInterval(tick, interval);
    return () => clearInterval(timerRef.current);
  }, [playing, bpm, grid]);

  const clearGrid = () => setGrid(PADS.map(() => Array(STEPS).fill(false)));

  return (
    <div className="min-h-screen w-full px-4 py-8 sm:px-8 flex flex-col items-center gap-8">
      <header className="text-center">
        <h1 className="text-4xl sm:text-5xl font-black tracking-widest bg-gradient-to-r from-fuchsia-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(236,72,153,0.4)]">
          NEON DRUM MACHINE
        </h1>
        <p className="mt-2 text-sm uppercase tracking-[0.3em] text-white/50">
          tap pads. sequence beats. vibe.
        </p>
      </header>

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
          <div className="min-w-[640px]">
            <div className="grid" style={{ gridTemplateColumns: `90px repeat(${STEPS}, 1fr)` }}>
              <div />
              {Array.from({ length: STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`text-center text-[10px] font-bold uppercase tracking-widest pb-2 ${
                    currentStep === i ? "text-cyan-300" : "text-white/40"
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {PADS.map((pad, row) => (
              <div
                key={pad.id}
                className="grid items-center gap-1 py-1"
                style={{ gridTemplateColumns: `90px repeat(${STEPS}, 1fr)` }}
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
          </div>
        </div>
      </section>

      <footer className="text-[11px] uppercase tracking-[0.3em] text-white/30 pb-4">
        Web Audio API · client only · no files
      </footer>
    </div>
  );
}
