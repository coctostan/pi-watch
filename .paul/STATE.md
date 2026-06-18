# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-18 10:13:09)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Phase 3 (Sampler implementation) — 03-01 UNIFY complete (pure sampler core); next plan 03-02 (ffmpeg effect boundary)

## Current Position

Milestone: v0.1 Initial Release
Phase: 03-sampler-implementation
Plan: 03-01 (Sampler core — pure frame-selection + assembly; type: tdd)
Status: UNIFY complete — loop closed; PR #3 merged to main
Last activity: 2026-06-18 — UNIFY 03-01: SUMMARY written; pure sampler core (selectFrameTimes + assembleWatchedFrameSet + mergeTranscript), 26 new specs, 38/38 suite, AC-1..5 PASS, 0 vulns
Next action: /paul:plan (Phase 3 plan 03-02 — ffmpeg/ffprobe/transcript effect boundary + sample() entry point)

Progress:
- Milestone: [██░░░░░░░░] ~22% (2 of ~9 phases)
- Phase 1: ✅ complete (merged to main)
- Phase 2: ✅ complete (02-01 unified; PR #2 merged)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Phase 3: 03-01 unified; loop closed → plan 03-02 next]
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

Last session: 2026-06-18 — APPLY+UNIFY Phase 3 plan 03-01 (pure sampler core, type: tdd)
Stopped at: 03-01 loop closed and merged (PR #3 squashed to main); ready to plan 03-02
Next action: /paul:plan for 03-02
Resume file: .paul/phases/03-sampler-implementation/03-01-SUMMARY.md
wip_result: n/a (code committed per-task; metadata committed at UNIFY)
Resume context:
- 03-01 shipped the pure deterministic sampler core: selectFrameTimes (scene-cut + gap-gated cadence-aware backfill + budget-cap uniform subsample), mergeTranscript, assembleWatchedFrameSet → produces values that pass validateWatchedFrameSet. 26 new specs, 38/38 suite, AC-1..5 PASS, 0 vulns, no new deps.
- Key 03-01 decision: backfill is gap-gated/cadence-aware (grid step = lower-median inter-cut gap for >=2 cuts; durationMs/budget for 0/1), not flat fill-to-budget — resolves the dense-vs-sparse example tension.
- 03-02 (next): ffmpeg scene-detect + ffprobe duration + yt-dlp/Whisper transcript fetch + frame decode behind the effect boundary, plus the sample() entry point and live golden-clip round-trips. ffmpeg/ffprobe/yt-dlp confirmed present on this machine.
- github-flow: Phase 2 PR #2 merged; 03-01 PR #3 squash-merged to main (82aff62); feature branch deleted; on main, synced.

### Git State
Last commit: 82aff62 (Phase 03-01 squash-merge on main, PR #3)
Branch: main (synced 0/0; feature/03-sampler-implementation deleted)
Feature branches merged: feature/01-tool-activation-spike (PR #1), feature/02-sampler-data-contract (PR #2), feature/03-sampler-implementation (PR #3)

---
*STATE.md — Updated after every significant action*
