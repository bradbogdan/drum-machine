# AI Readiness Audit: drum-machine

- **Audit date**: 2026-05-10
- **Rubric version**: v1
- **Archetype detected**: `web-app-with-backend` (evidence: `next.config.mjs`, server actions at `app/actions/{coach,presets}.js`, Supabase auth route at `app/auth/callback/route.js`, `middleware.js` for auth)
- **Total LOC (source only)**: 1,978 across `app/`, `components/`, `lib/`, `docs/`
- **Last commit**: 2026-05-09 (7 commits in last 90 days, active)
- **Override file**: absent

## Scores

| Axis | Score | Notes |
|---|---|---|
| Dev-agent readiness | **3.6 / 10** | Strong AGENTS.md and quality gate; no types, tests, lint, CI, ARCHITECTURE.md, or per-folder signposting; sparse comments in 1000+ lines of audio code |
| Consumer-agent readiness | **1.9 / 10** | Server actions exist but no public API, no MCP, no OpenAPI, no discovery surfaces, OAuth-only auth, pads lack ARIA |

## Top 5 fixes (by leverage)

1. **Write `docs/ARCHITECTURE.md` + add module index to AGENTS.md** — Axis: dev · Effort: S · Score delta: +1.0
   - First step: create `docs/ARCHITECTURE.md` with four sections: (1) signal chain (oscillator → envelope → synthBus → destination), (2) state ownership (React state vs Supabase rows vs `useRef` vs AudioContext), (3) coach pipeline (vibe prompt → `prompt.js` → `generate-schema.js` → server action `coach.js` → patch into DrumMachine), (4) one-line module index pointing to `lib/synth.js`, `lib/coach/`, `app/actions/`, `components/DrumMachine.jsx`. Then add a "Module map" section to root `CLAUDE.md` referencing it.

2. **Add JSDoc + `// @ts-check` to `lib/synth.js` and `lib/coach/*`** — Axis: dev · Effort: M · Score delta: +1.5
   - First step: prepend `// @ts-check` to `lib/synth.js` (340 lines, 0 comments today). JSDoc the four exports referenced by `DrumMachine.jsx`: `getCtx()`, `startSynthNote(note, wave, ctx)`, plus the `SOUNDS`/`PADS`/`MELODY_NOTES`/`SYNTH_WAVES` constants (shapes + units: Hz, seconds, gain 0 to 1). Repeat for `lib/coach/serialize.js`, `prompt.js`, `generate-schema.js`. This single change unlocks editor type-checking for any future agent.

3. **Add per-folder `CLAUDE.md` + `AGENTS.md` symlink in `lib/`, `components/`, `app/actions/`, `docs/`** — Axis: dev · Effort: S · Score delta: +0.8
   - First step: `lib/CLAUDE.md` (10 to 15 lines) describing the synth signal chain and the coach sub-pipeline; `components/CLAUDE.md` calling out that `DrumMachine.jsx` is the composer and is overdue for a split; `app/actions/CLAUDE.md` listing each server action's contract; `docs/CLAUDE.md` describing the migration numbering rule. After each, run `ln -s CLAUDE.md AGENTS.md` per the workspace rule in `~/Claude/Code/CLAUDE.md`.

4. **Commit `.env.example` with documented keys** — Axis: both · Effort: S · Score delta: +0.5
   - First step: create `.env.example` listing `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=`, `OPENAI_API_KEY=` with a one-line comment per key on where to obtain it (Supabase project ref `dnhskrlsjwyjfthiczop`, OpenAI dashboard). `.env*` is already gitignored (`.gitignore` line 6) so the example template is safe to commit. This is the single largest unblocker for any agent or new contributor cold-starting the repo.

5. **Add `aria-label`/`data-testid` on pads + keys + transport, and publish a JSON Schema for the pattern object** — Axis: consumer · Effort: M · Score delta: +1.5
   - First step: in `components/DrumMachine.jsx` add `aria-label={`Pad: ${pad.name}`}` and `data-testid={`pad-${pad.id}`}` to each of the 16 pads, the piano keys, the play/stop button, and the BPM slider (today the grep finds only 2 ARIA/role/testid hits across the whole UI). Then extract the coach output shape from `lib/coach/generate-schema.js` into `docs/pattern.schema.json` (JSON Schema draft-2020-12). This makes the UI driveable by browser-based agents AND lets external agents author patterns without round-tripping through the LLM.

## Foundations findings

| Check | Score | Evidence | Justification |
|---|---|---|---|
| F1 README orients reader (w=3) | 1 | `README.md` 26 lines, lists run + features | No architecture or "how it fits together"; an agent cannot map data flow from the README |
| F2 Root AGENTS.md (w=3) | 2 | `CLAUDE.md` 32 lines, `AGENTS.md` symlink present | Stack, port, deploy, DB conventions, handoff pointer all current |
| F3 Secrets hygiene (w=4) | 1 | `.gitignore:6` excludes `.env*`; no secrets in git history; no `.env.example` | Gitignored correctly but no template to bootstrap from |
| F4 License + author (w=1) | 0 | No `LICENSE` file; `package.json` has no `license` field, marked `"private": true` | Personal repo, but a public GitHub repo with no LICENSE is a soft consumer signal |
| F5 Quality gate documented (w=3) | 2 | `CLAUDE.md` line: "Quality gate is a clean `next build`" | Explicit and runnable |
| F6 Reproducibility (w=2) | 1 | `package-lock.json` present; no `engines`, no `.nvmrc` | Lockfile good; Node version undeclared |
| F7 Git hygiene (w=1) | 2 | 7 commits in 90d; sample subjects: "Producer Coach: generate beats from a vibe prompt", "Add user presets" | Active and descriptive |
| F8 Folder layout (w=2) | 1 | Standard Next.js layout; only root `CLAUDE.md`/`AGENTS.md` | No nested signposting and no module index in root AGENTS |
| F9 Override (meta) | n/a | `.ai-readiness.yml` absent | Standard run |

Foundations weighted: 25 / 38 max applicable = 65.8%.

## Dev-agent findings

| Check | Score | Evidence | Justification |
|---|---|---|---|
| D1 Type safety (w=4) | 0 | `.js`/`.jsx` throughout; no `tsconfig.json`; no `@ts-check`; no JSDoc on exports | Plain JS, agent must infer all shapes |
| D2 Per-folder AGENTS (w=3) | 0 | `find` returns only root `CLAUDE.md`/`AGENTS.md` | Major folders (`lib/`, `components/`, `app/actions/`, `docs/`) have no signposting |
| D3 Comments (w=3) | 0 | `lib/synth.js` 340 lines, 0 comments; `components/DrumMachine.jsx` 626 lines, 1 comment; `lib/coach/*.js` 5 comments each, no docstrings | Heart of the audio engine has zero WHY explanation |
| D4 Tests (w=1, personal experiment) | 1 | No test files found; `CLAUDE.md` explicitly says "No tests, no lint script. Quality gate is a clean `next build`." | Acknowledged absence; passes at 1 per rubric note |
| D5 Lint + format (w=2) | 0 | No `.eslintrc*`, no `eslint.config.*`, no `.prettierrc*` | Neither configured |
| D6 CI (w=2) | 0 | No `.github/workflows/` | Vercel auto-deploy is not the same as a CI gate |
| D7 Architecture doc (w=3) | 0 | No `ARCHITECTURE.md`, no `docs/architecture/`; README has features but no "how it works" | Largest dev-axis gap by weight × delta |
| D8 ADR (w=1) | 0 | No `docs/decisions/` or `docs/adr/` | Why Web Audio over Tone.js, why server actions over API routes are undocumented |
| D9 Error catalog (w=1) | 0 | No `docs/troubleshooting.md` or `docs/errors.md` | RLS-denied, AudioContext-suspended, OpenAI 429 are predictable failures with no doc |
| D10 Stale-link check (w=1) | 2 | `CLAUDE.md` references (`docs/0NN_*.sql`, port 3001, Supabase ref, handoff path) all verified present | Docs match reality |

Dev-agent rubric: 3 / 42 max = 7.1%.
**Combined dev-agent score (foundations dev-tagged + rubric)**: (25 + 3) / (36 + 42) = 35.9% → **3.6 / 10**.

## Consumer-agent findings

Applies because archetype is `web-app-with-backend`.

| Check | Score | Evidence | Justification |
|---|---|---|---|
| C1 Programmatic surface (w=5) | 1 | Server actions in `app/actions/coach.js`, `app/actions/presets.js`; not externally callable | Internal RPC only; no public HTTP API |
| C2 API spec (w=4) | 0 | No `openapi.yaml`, no `.proto`, no `schema.graphql` | Nothing for an external client to introspect |
| C3 MCP server (w=3) | 0 | No `mcp-server/`, no `*.mcp.{ts,js}` | No native agent-protocol surface |
| C4 Discovery (w=2) | 0 | No `public/llms.txt`, no `.well-known/`, no `robots.txt`; `public/` folder does not exist | Zero agent-discovery signposting at the deployed site root |
| C5 Auth flow agent-completable (w=3) | 0 | Supabase OAuth via browser; no PAT/API-key issuance UI | Only humans can complete auth |
| C6 Error semantics (w=2) | 0 | Server actions return ad-hoc objects; no `code`/`request_id`/`Retry-After` | Unstructured |
| C7 Idempotency (w=2) | 0 | No `Idempotency-Key` handling in actions | A retry creates duplicate presets |
| C8 Long-running ops (w=1) | 0 | Coach action calls OpenAI synchronously, blocks response | No webhook/SSE/job pattern |
| C9 Domain object schema (w=2) | 1 | `lib/coach/generate-schema.js` defines pattern shape in code | Exists but not published as JSON Schema |
| C10 Versioning (w=1) | 0 | No `/v1/` prefix; no version header | None |
| C11 ARIA / agent-driveable UI (w=2) | 0 | grep across `components/` + `app/` finds 2 `aria-label\|data-testid\|role=` matches total; pads are styled `<button>`/`<div>` with no labels | Browser-driving agents cannot identify pads or keys |
| C12 Rate limit transparency (w=1) | 0 | No rate limiter | Not applicable but counted as 0 per rubric |

Consumer-agent rubric: 7 / 56 max = 12.5%.
**Combined consumer-agent score (foundations consumer-tagged + rubric)**: (7 + 7) / (16 + 56) = 19.4% → **1.9 / 10**.

## Appendix: secondary findings

- `components/DrumMachine.jsx` is 626 lines mixing transport, sequencer state, melody recording, UI grid, piano keyboard, and presets/coach glue. Splitting it improves dev-axis comprehension but does not directly move a rubric check; it is a code-quality finding, not a readiness one.
- `lib/coach/generate-schema.js` likely contains the most leverageable schema in the repo. Lifting it to `docs/pattern.schema.json` doubles as C9 evidence and as a contract third-party agents can author against.
- The `.env.local` file has been edited locally on 2026-05-09 (288 bytes). Reminder: never commit it. Current `.gitignore` rule `.env*` covers it correctly.
- No `tsconfig.json`. Adding one with `allowJs: true, checkJs: true, strict: true` would let you keep `.js` files while still gaining type-checking; this stacks with fix #2.
- No `LICENSE` file. For a public repo, a one-line `MIT` license file is a 30-second fix and clarifies reuse.
- Vercel deploy is documented in `CLAUDE.md` but no production smoke check (a `/health` route or equivalent) exists for an agent to verify a deploy.

## Re-run instructions

Run `/ai-readiness-audit` from this repo's root. Compare scores against the JSON sidecar at `docs/ai-readiness/ai-readiness-2026-05-10.json` to track movement. Expected next milestone: dev-agent crossing 6.0 after fixes 1, 2, and 3 are done.
