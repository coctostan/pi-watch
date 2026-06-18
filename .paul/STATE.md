# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-18 10:13:09)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Phase 4 (Router) — ready to plan. Phase 3 complete: sampler end-to-end (pure core + effect boundary + sample() entry point), merged to main.

## Current Position

Milestone: v0.1 Initial Release
Phase: 04-router
Plan: Not started
Status: Ready to plan
Last activity: 2026-06-18 — Phase 3 complete (03-01 + 03-02 unified, PR #4 merged 2f9f669); transitioned to Phase 4
Next action: /paul:plan (Phase 4 — Router: tier-selection + escalation policy as a deterministically-tested unit)

Progress:
- Milestone: [███░░░░░░░] ~33% (3 of ~9 phases complete)
- Phase 1: ✅ complete (PR #1 merged)
- Phase 2: ✅ complete (02-01; PR #2 merged)
- Phase 3: ✅ complete (03-01 + 03-02; PR #4 merged 2f9f669)
- Phase 4: Router — not started

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Phase 4: not started → /paul:plan next]
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

Last session: 2026-06-18 — paused at Phase 4 boundary (Phase 3 complete + transitioned)
Stopped at: Phase 3 closed (03-02 UNIFY + PR #4 merged + transition done); Phase 4 not started, ready to plan
Next action: /paul:plan (Phase 4 — Router: tier-selection + escalation policy as a deterministically-tested unit)
Resume file: .paul/HANDOFF-2026-06-18-phase4-router-ready.md
wip_result: skipped (no project changes; only untracked .codegraph/ tooling dir)
Resume context:
- Phase 3 shipped the sampler end-to-end: 03-01 pure core (selectFrameTimes + assembleWatchedFrameSet + mergeTranscript) and 03-02 effect boundary (effects.ts: ffprobe/ffmpeg/transcript) + sample() entry point. Validated by a ffmpeg-lavfi golden-clip round-trip; 48/48 suite on main.
- sample() is the stable, validator-guaranteed surface Phase 4 (router) and Phase 5 (watch tool) wrap. Effect fns + pure parsers exported for reuse.
- Planned deferral: real caption/Whisper transcript parsing — fetchTranscript returns "none" (best-effort, never throws); a later tier-1/transcript plan fills it in without changing the seam.
- Phase 4 (Router): tier-selection + escalation policy as its own deterministically-tested unit, routing over the WatchedFrameSet sample() produces (DESIGN §2, ROADMAP phase 4).
- github-flow: all phases merged to main (PR #1/#2/#3/#4); on main, synced 0/0; no open PRs.

### Git State
Last commit: 2f9f669 (Phase 03-02 PR #4 squash-merge, on main)
Branch: main (synced 0/0; feature/03-02-sampler-effects deleted on merge)
Feature branches merged: PR #1 (01), PR #2 (02), PR #3 (03-01 → 82aff62), PR #4 (03-02 → 2f9f669)

---
*STATE.md — Updated after every significant action*
