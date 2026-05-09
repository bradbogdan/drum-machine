-- Extends patterns to capture the full DrumMachine state, not just the drum grid + BPM.
-- melody_grid: 2D boolean array of melody steps (jsonb mirrors the React state shape).
-- synth_wave:  selected oscillator wave, one of the SYNTH_WAVES ids in lib/synth.js.
-- Existing rows get safe defaults so the migration is non-breaking.

alter table public.patterns
  add column if not exists melody_grid jsonb not null default '[]'::jsonb,
  add column if not exists synth_wave  text  not null default 'sawtooth';
