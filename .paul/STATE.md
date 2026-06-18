# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-18 10:13:09)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Phase 3 (Sampler implementation) — ready to plan (Phase 2 complete)

## Current Position

Milestone: v0.1 Initial Release
Phase: 03-sampler-implementation
Plan: Not started
Status: Ready to plan
Last activity: 2026-06-18 — Phase 2 complete (02-01 unified); transitioned to Phase 3
Next action: /paul:plan for Phase 3 (Sampler implementation)

Progress:
- Milestone: [██░░░░░░░░] ~22% (2 of ~9 phases)
- Phase 1: ✅ complete (merged to main)
- Phase 2: ✅ complete (02-01 unified; PR #2 merged)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Phase 2 closed; Phase 3 ready to plan]
```

## Accumulated Context

### Decisions
- WE own the sampling; the model end is a thin OpenAI-compatible adapter (local-vs-hosted is config, not code forks).
- Build the `watch` tool as the primitive first; the `/watch` command and batching wrap it.
- Qwen3-VL is the local tier-2 pick (real temporal architecture vs Gemma ≈ frames).
- No mandatory Gemini/cloud dependency; local-first on Apple Silicon (M4 Pro, 48 GB).
- (Phase 2) Toolchain = Vitest + TypeBox; one schema → static type + runtime validator.
- (Phase 2) `WatchedFrameSet` is tier-neutral; OpenAI `content[]` serialization isolated in `serialize.ts`.

### Deferred Issues
- Tier-3 batch via subagent fan-out (only needed for frames-for-many-videos).
- Optional Gemini tier-2 upgrade (only if a key is added).

### Blockers/Concerns
- RESOLVED (Phase 1): the print-mode "tool not found" symptom was the `pi-loadout` governor stripping newly-registered tools from the active set — not pi/-e/print. Custom-tool activation works in all modes. Phase-5 carry: ship `watch` as an installed package and ensure it's in the active loadout. See spikes/01-tool-activation/FINDINGS.md.

## Session Continuity

Last session: 2026-06-18 — completed Phase 2 (02-01 unified), transitioned to Phase 3, then paused
Stopped at: Phase 2 complete; ready to plan Phase 3 (session paused)
Next action: /paul:plan for Phase 3 (Sampler implementation)
Resume file: .paul/HANDOFF-2026-06-18-phase3-ready.md
wip_result: skipped (clean tree; on main, synced 0/0)
Resume context:
- Phase 2 shipped the WatchedFrameSet contract + pure toOpenAIContent serializer (tier-neutral; OpenAI shapes in serialize.ts) on the first production TS toolchain (Vitest + TypeBox). 12 tests, 0 vulns.
- Phase 3 (sampler implementation) will PRODUCE WatchedFrameSet: ffmpeg scene-change + uniform backfill + budget cap + transcript merge, with golden-clip fixtures.
- github-flow: Phase 2 PR #2 merged to main; on main, synced.

### Git State
Last commit: a2c1a5b (Phase 2 squash-merge on main, PR #2)
Branch: main (synced)
Feature branches merged: feature/01-tool-activation-spike (PR #1), feature/02-sampler-data-contract (PR #2)

---
*STATE.md — Updated after every significant action*
