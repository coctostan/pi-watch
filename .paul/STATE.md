# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-18 10:13:09)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Phase 3 (Sampler implementation) — COMPLETE (03-01 pure core + 03-02 effect boundary/sample() both unified); merge PR #4 then transition to Phase 4 (router)

## Current Position

Milestone: v0.1 Initial Release
Phase: 03-sampler-implementation
Plan: 03-02 (ffmpeg/ffprobe effect boundary + sample() entry point; type: execute)
Status: UNIFY complete — loop closed; SUMMARY written; AC-1..5 PASS; awaiting PR #4 merge gate + phase transition
Last activity: 2026-06-18 — UNIFY 03-02: SUMMARY written; effect boundary + sample() entry point reconciled; 48/48 suite, 0 vulns, no new deps; all 5 ACs PASS; 1 planned deferral (real transcript parsing)
Next action: github-flow merge gate (merge PR #4) → phase 3 transition

Progress:
- Milestone: [██░░░░░░░░] ~22% (2 of ~9 phases; Phase 3 implementation complete, pending merge + transition)
- Phase 1: ✅ complete (merged to main)
- Phase 2: ✅ complete (02-01 unified; PR #2 merged)
- Phase 3: ✅ implemented (03-01 + 03-02 unified; PR #4 pending merge)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Phase 3: 03-02 unified; loop closed → merge gate + transition]
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

Last session: 2026-06-18 — UNIFY Phase 3 plan 03-02 (effect boundary + sample() entry point)
Stopped at: UNIFY complete; SUMMARY written; PR #4 open — next is merge gate + phase 3 transition
Next action: merge PR #4 (github-flow gate) → transition phase 3 → /paul:plan (phase 4 router)
Resume file: none (loop closed)
wip_result: n/a (UNIFY artifacts commit with merge-gate step)
Resume context:
- Phase 3 fully implemented across two plans: 03-01 pure sampler core (selectFrameTimes + assembleWatchedFrameSet + mergeTranscript) and 03-02 effect boundary (effects.ts: ffprobe/ffmpeg/transcript) + sample() entry point.
- sample() is the stable, validator-guaranteed surface Phase 4 (router) and Phase 5 (watch tool) wrap. Effect fns + pure parsers exported for reuse.
- Planned deferral: real caption/Whisper transcript parsing — fetchTranscript currently returns "none" (best-effort, never throws); a later tier-1/transcript plan fills it in without changing the seam.
- Phase 3 complete (2 PLANs / 2 SUMMARYs) → after PR #4 merge, run phase transition, then /paul:plan for Phase 4 (router).
- github-flow: Phase 2 PR #2 merged; 03-01 PR #3 squash-merged (82aff62); 03-02 on feature/03-02-sampler-effects → PR #4 OPEN (mergeable; Socket Security check).

### Git State
Last commit: 3cac4b1 (03-02 Task 3 tests, on feature/03-02-sampler-effects)
Branch: feature/03-02-sampler-effects (PR #4 open → main; ahead 3 task commits + pending UNIFY metadata)
Feature branches merged: feature/01-tool-activation-spike (PR #1), feature/02-sampler-data-contract (PR #2), feature/03-sampler-implementation (PR #3)

---
*STATE.md — Updated after every significant action*
