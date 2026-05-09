"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function listPresets() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("patterns")
    .select("id, name, bpm, synth_wave, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function savePreset({ name, bpm, grid, melodyGrid, synthWave }) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) throw new Error("Name is required");

  const { supabase, user } = await requireUser();
  const row = {
    user_id: user.id,
    name: trimmed,
    bpm,
    grid,
    melody_grid: melodyGrid,
    synth_wave: synthWave,
  };

  // Upsert by (user_id, name) so re-saving the same name overwrites.
  // No DB-level unique constraint exists, so we do it as an update-then-insert.
  const { data: existing } = await supabase
    .from("patterns")
    .select("id")
    .eq("name", trimmed)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("patterns")
      .update(row)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    revalidatePath("/");
    return { id: existing.id, updated: true };
  }

  const { data, error } = await supabase
    .from("patterns")
    .insert(row)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return { id: data.id, updated: false };
}

export async function loadPreset(id) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("patterns")
    .select("id, name, bpm, grid, melody_grid, synth_wave")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    name: data.name,
    bpm: data.bpm,
    grid: data.grid,
    melodyGrid: data.melody_grid,
    synthWave: data.synth_wave,
  };
}

export async function deletePreset(id) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("patterns").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return { ok: true };
}
