"use client";

import { useState, useTransition } from "react";
import { generateBeat, getCoachFeedback } from "@/app/actions/coach";

// Producer-coach panel. Two modes:
// - Critique: takes the live state, returns text feedback.
// - Generate: takes a free-text vibe prompt + live state, asks the coach to
//   compose a fresh pattern that overwrites the grid. One-slot Undo restores
//   the prior state.
// Server actions handle auth + the OpenRouter call; this component never sees
// the API key.
export default function CoachPanel({ getCurrentState, applyPreset }) {
  const [feedback, setFeedback] = useState("");
  const [generateNote, setGenerateNote] = useState("");
  const [request, setRequest] = useState("");
  const [error, setError] = useState(null);
  const [stash, setStash] = useState(null);
  const [isPending, startTransition] = useTransition();

  function handleAsk() {
    setError(null);
    const state = getCurrentState();
    startTransition(async () => {
      try {
        const res = await getCoachFeedback(state);
        setFeedback(res.feedback);
        setGenerateNote("");
      } catch (err) {
        setError(err.message || "Something went wrong");
        setFeedback("");
      }
    });
  }

  function handleGenerate() {
    const trimmed = request.trim();
    if (!trimmed) {
      setError("Tell the coach what you want");
      return;
    }
    setError(null);
    const state = getCurrentState();
    startTransition(async () => {
      try {
        const res = await generateBeat({ prompt: trimmed, state });
        setStash(state);
        applyPreset(res.pattern);
        setGenerateNote(res.pattern.note || "");
        setFeedback("");
      } catch (err) {
        setError(err.message || "Something went wrong");
      }
    });
  }

  function handleUndo() {
    if (!stash) return;
    applyPreset(stash);
    setStash(null);
    setGenerateNote("");
  }

  function handleClear() {
    setFeedback("");
    setGenerateNote("");
    setError(null);
  }

  return (
    <section className="w-full max-w-5xl rounded-2xl border border-amber-300/20 bg-black/40 backdrop-blur p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-sm font-black uppercase tracking-[0.32em] text-amber-200">
            Producer Coach
          </h2>
          <div className="mt-1 h-px w-24 bg-gradient-to-r from-amber-300 via-rose-300 to-transparent" />
        </div>

        <button
          onClick={handleAsk}
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-amber-300 text-black text-xs font-black uppercase tracking-[0.2em] hover:bg-amber-200 disabled:opacity-50"
        >
          {isPending ? "Thinking…" : "Ask the producer"}
        </button>
        <button
          onClick={handleClear}
          disabled={isPending || (!feedback && !generateNote && !error)}
          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-xs uppercase tracking-widest disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isPending) handleGenerate();
          }}
          placeholder="Describe a vibe, e.g. interstellar-style, slow and dark"
          maxLength={500}
          className="flex-1 min-w-[260px] px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:border-amber-300/60"
        />
        <button
          onClick={handleGenerate}
          disabled={isPending || !request.trim()}
          className="px-4 py-2 rounded-lg bg-rose-400 text-black text-xs font-black uppercase tracking-[0.2em] hover:bg-rose-300 disabled:opacity-50"
        >
          {isPending ? "Composing…" : "Generate"}
        </button>
        <button
          onClick={handleUndo}
          disabled={isPending || !stash}
          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-xs uppercase tracking-widest disabled:opacity-50"
          title="Restore the grid you had before Generate"
        >
          Undo
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-rose-300 tracking-wide">{error}</p>
      )}

      {generateNote && (
        <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/5 p-3 text-sm text-amber-100/90 leading-relaxed">
          {generateNote}
        </p>
      )}

      {feedback && (
        <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/90 font-sans leading-relaxed">
          {feedback}
        </pre>
      )}
    </section>
  );
}
