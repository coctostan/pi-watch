# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-18 10:13:09)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Phase 4 (Router) — 04-01 UNIFIED; pure tier-selection + escalation-chain decision unit shipped. Awaiting PR #5 merge gate before Phase 5.

## Current Position

Milestone: v0.1 Initial Release
Phase: 04-router
Plan: 04-01 (.paul/phases/04-router/04-01-PLAN.md)
Status: Unified — phase complete; PR #5 merge gate pending
Last activity: 2026-06-18 — Phase 4 UNIFY complete (04-01 Router: SUMMARY written, all 5 ACs PASS, suite 48→64; CODI+QUALITY rows appended)
Next action: merge PR #5 → main, then transition to Phase 5 (watch tool primitive) and /paul:plan

Progress:
- Milestone: [███░░░░░░░] ~33% (3 of ~9 phases complete)
- Phase 1: ✅ complete (PR #1 merged)
- Phase 2: ✅ complete (02-01; PR #2 merged)
- Phase 3: ✅ complete (03-01 + 03-02; PR #4 merged 2f9f669)
- Phase 4: Router — ✅ unified (04-01; 64/64 green), PR #5 merge gate pending

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Phase 4: 04-01 complete → merge PR #5, then Phase 5]
```

## Accumulated Context

### Decisions
- WE own the sampling; the model end is a thin OpenAI-compatible adapter (local-vs-hosted is config, not code forks).
- Build the `watch` tool as the primitive first; the `/watch` command and batching wrap it.
- Qwen3-VL is the local tier-2 pick (real temporal architecture vs Gemma ≈ frames).
- No mandatory Gemini/cloud dependency; local-first on Apple Silicon (M4 Pro, 48 GB).
- (Phase 2) Toolchain = Vitest + TypeBox; one schema → static type + runtime validator.
- (Phase 2) `WatchedFrameSet` is tier-neutral; OpenAI `content[]` serialization isolated in `serialize.ts`.
- (Phase 3) Sampler backfill is gap-gated/cadence-aware (not flat fill-to-budget); budget cap uniformly subsamples scene cuts (never first-N truncation).
- (Phase 3) Sampler core is a pure decision layer; ffmpeg/ffprobe/transcript-fetch effects deferred to plan 03-02.

### Deferred Issues
- Tier-3 batch via subagent fan-out (only needed for frames-for-many-videos).
- Optional Gemini tier-2 upgrade (only if a key is added).

### Blockers/Concerns
- RESOLVED (Phase 1): the print-mode "tool not found" symptom was the `pi-loadout` governor stripping newly-registered tools from the active set — not pi/-e/print. Custom-tool activation works in all modes. Phase-5 carry: ship `watch` as an installed package and ensure it's in the active loadout. See spikes/01-tool-activation/FINDINGS.md.

## Session Continuity

Last session: 2026-06-18 — Phase 4 APPLY complete (04-01 Router)
Stopped at: 04-01 applied — router + specs committed (502d5ec, 21c00c5) on branch phase-04-router; pushed; PR #5 open; STATE → APPLY ✓; awaiting UNIFY
Next action: /paul:unify .paul/phases/04-router/04-01-PLAN.md (Phase 4 — Router)
Resume file: .paul/phases/04-router/04-01-PLAN.md
wip_result: skipped (no project changes; only untracked .codegraph/ tooling dir)
Resume context:
- Phase 3 shipped the sampler end-to-end: 03-01 pure core (selectFrameTimes + assembleWatchedFrameSet + mergeTranscript) and 03-02 effect boundary (effects.ts: ffprobe/ffmpeg/transcript) + sample() entry point. Validated by a ffmpeg-lavfi golden-clip round-trip; 48/48 suite on main.
- sample() is the stable, validator-guaranteed surface Phase 4 (router) and Phase 5 (watch tool) wrap. Effect fns + pure parsers exported for reuse.
- Planned deferral: real caption/Whisper transcript parsing — fetchTranscript returns "none" (best-effort, never throws); a later tier-1/transcript plan fills it in without changing the seam.
- Phase 4 PLAN (04-01): pure `src/router/` decision unit — `classifyQuestion` + `route` + `routeContextFromSet`. Policy: spoken+transcript → [1,2,3]; spoken-no-transcript/visual/on-screen-text → [2,3]; on-screen-text → resolution "high"; every chain ends in tier 3 (universal fallback). 2 tasks (impl + deterministic route specs), no new deps, contract+sampler frozen (import types only).
- github-flow: prior phases merged to main (PR #1/#2/#3/#4); Phase 4 on branch phase-04-router, PR #5 OPEN (CI = Socket Security pending; no project ci.yml yet). UNIFY owns merge readiness + the .paul/ lifecycle commit (PLAN/STATE/ROADMAP still uncommitted).

### Git State
Last commit: 21c00c5 (Phase 04-01 Task 2 test, on branch phase-04-router)
Branch: phase-04-router (PR #5 open → main; ahead by 2 commits 502d5ec, 21c00c5)
Feature branches merged: PR #1 (01), PR #2 (02), PR #3 (03-01 → 82aff62), PR #4 (03-02 → 2f9f669)

---
*STATE.md — Updated after every significant action*
