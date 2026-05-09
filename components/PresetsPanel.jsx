"use client";

import { useEffect, useState, useTransition } from "react";
import {
  deletePreset,
  listPresets,
  loadPreset,
  savePreset,
} from "@/app/actions/presets";

// Presets UI: save the current state under a name, list past saves, load or delete one.
// Server actions handle auth + persistence; this component is only rendered when a user
// is logged in (controlled by the parent).
export default function PresetsPanel({
  getCurrentState,
  applyPreset,
}) {
  const [presets, setPresets] = useState([]);
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  async function refresh() {
    try {
      const rows = await listPresets();
      setPresets(rows);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleSave() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the preset a name first.");
      return;
    }
    const state = getCurrentState();
    startTransition(async () => {
      try {
        await savePreset({ name: trimmed, ...state });
        setName("");
        await refresh();
      } catch (err) {
        setError(err.message);
      }
    });
  }

  function handleLoad() {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      try {
        const preset = await loadPreset(selectedId);
        applyPreset(preset);
      } catch (err) {
        setError(err.message);
      }
    });
  }

  function handleDelete() {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      try {
        await deletePreset(selectedId);
        setSelectedId("");
        await refresh();
      } catch (err) {
        setError(err.message);
      }
    });
  }

  return (
    <section className="w-full max-w-5xl rounded-2xl border border-fuchsia-300/20 bg-black/40 backdrop-blur p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-sm font-black uppercase tracking-[0.32em] text-fuchsia-200">
            Presets
          </h2>
          <div className="mt-1 h-px w-24 bg-gradient-to-r from-fuchsia-300 via-cyan-300 to-transparent" />
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Preset name"
          maxLength={64}
          className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:border-cyan-300/60"
        />
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-cyan-400 text-black text-xs font-black uppercase tracking-[0.2em] hover:bg-cyan-300 disabled:opacity-50"
        >
          Save
        </button>

        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm text-white focus:outline-none focus:border-fuchsia-300/60"
        >
          <option value="">Select preset</option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.bpm} BPM)
            </option>
          ))}
        </select>
        <button
          onClick={handleLoad}
          disabled={isPending || !selectedId}
          className="px-4 py-2 rounded-lg bg-fuchsia-500 text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-fuchsia-400 disabled:opacity-50"
        >
          Load
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending || !selectedId}
          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-xs uppercase tracking-widest disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-rose-300 tracking-wide">{error}</p>
      )}
    </section>
  );
}
