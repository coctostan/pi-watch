# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-18 10:13:09)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Phase 2 (Sampler data contract) — ready to plan

## Current Position

Milestone: v0.1 Initial Release
Phase: 02-sampler-data-contract
Plan: Not started
Status: Ready to plan
Last activity: 2026-06-18 — Phase 1 complete (PR #1 merged), transitioned to Phase 2
Next action: /paul:plan for Phase 2

Progress:
- Milestone: [█░░░░░░░░░] ~11% (1 of ~9 phases)
- Phase 1: ✅ complete (merged to main)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Phase 1 closed; Phase 2 not started]
```

## Accumulated Context

### Decisions
- WE own the sampling; the model end is a thin OpenAI-compatible adapter (local-vs-hosted is config, not code forks).
- Build the `watch` tool as the primitive first; the `/watch` command and batching wrap it.
- Qwen3-VL is the local tier-2 pick (real temporal architecture vs Gemma ≈ frames).
- No mandatory Gemini/cloud dependency; local-first on Apple Silicon (M4 Pro, 48 GB).

### Deferred Issues
- Tier-3 batch via subagent fan-out (only needed for frames-for-many-videos).
- Optional Gemini tier-2 upgrade (only if a key is added).

### Blockers/Concerns
- RESOLVED (Phase 1): the print-mode "tool not found" symptom was the `pi-loadout` governor stripping newly-registered tools from the active set — not pi/-e/print. Custom-tool activation works in all modes. Phase-5 carry: ship `watch` as an installed package and ensure it's in the active loadout. See spikes/01-tool-activation/FINDINGS.md.

## Session Continuity

Last session: 2026-06-18 — Phase 1 complete & merged; transitioned to Phase 2
Stopped at: Phase 1 closed (PR #1 squash-merged to main); Phase 2 not started
Next action: /paul:plan for Phase 2 (Sampler data contract)
Resume file: .paul/ROADMAP.md
Resume context:
- Tool-activation risk fully de-risked; recipe in spikes/01-tool-activation/FINDINGS.md.
- Phase-5 carry: ship `watch` as installed package + ensure it's in active loadout.

### Git State
Last commit: 7ea09aa (main)
Branch: main
Feature branches merged: feature/01-tool-activation-spike (PR #1, squash, deleted)

---
*STATE.md — Updated after every significant action*
