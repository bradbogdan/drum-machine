# CLAUDE.md

Type: Personal Project

Neon drum machine + melody synth, fully client-side audio via Web Audio API. Public repo at `bradbogdan/drum-machine`. Inherits rules from `~/Claude/Code/personal/CLAUDE.md` and the workspace root above it.

## Stack

- Next.js ^16.2.4 (Turbopack), React 18.3.1, Tailwind 3.4
- Supabase (auth + Postgres + RLS) for per-user persisted presets
- All sounds programmatic in `lib/synth.js`; no audio files

## Local commands

- `npm run dev` — dev server on **`:3001`** (pm-ai-saas owns `:3000`)
- `npm run build` / `npm run start` — production
- No tests, no lint script. Quality gate is a clean `next build`.

## Deploy

- Vercel auto-deploys on push to `main` via the GitHub integration. Production URL: `https://drum-machine-teal-nine.vercel.app`.
- The local `vercel` CLI token is stale; ignore it. Pushing is enough.

## Database

- Schema migrations live in `docs/0NN_*.sql`, replayed in order. Always add a new numbered file for any schema change; never paste SQL into chat for Bogdan to run blind. Rule comes from `~/Claude/Code/CLAUDE.md` "SQL and Supabase".
- Supabase project ref: `dnhskrlsjwyjfthiczop` (Enlion Services org). Anon key is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- RLS is on; every policy scopes by `auth.uid() = user_id`.

## Where in-flight state lives

- Most-recent session state is in `~/.claude/projects/-Users-bogdan-georgebrad-Claude/memory/coding_handoff_drum-machine.md`. Read it on session start (per the workspace-level handoff rule).

## AGENTS.md mirror

`AGENTS.md` is a symlink to this file. Edit only `CLAUDE.md`.
