"use client";

import { useState, useTransition } from "react";
import { getCoachFeedback } from "@/app/actions/coach";

// Producer-coach panel. Sends current beat state to the server action,
// renders the model's reply as plain pre-formatted text. The OPENROUTER_API_KEY
// never leaves the server; this component only sees the response string.
export default function CoachPanel({ getCurrentState }) {
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  function handleAsk() {
    setError(null);
    const state = getCurrentState();
    startTransition(async () => {
      try {
        const res = await getCoachFeedback(state);
        setFeedback(res.feedback);
      } catch (err) {
        setError(err.message || "Something went wrong");
        setFeedback("");
      }
    });
  }

  function handleClear() {
    setFeedback("");
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
          disabled={isPending || (!feedback && !error)}
          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-xs uppercase tracking-widest disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-rose-300 tracking-wide">{error}</p>
      )}

      {feedback && (
        <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/90 font-sans leading-relaxed">
          {feedback}
        </pre>
      )}
    </section>
  );
}
