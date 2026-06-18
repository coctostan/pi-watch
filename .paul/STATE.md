# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-18 10:13:09)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Phase 1 (Tool-activation spike) UNIFY complete — PR #1 merge gate + phase transition next

## Current Position

Milestone: v0.1 Initial Release
Phase: 01-tool-activation-spike
Plan: 01-01 (type: research) — Complete (SUMMARY written)
Status: UNIFY complete — phase transition / merge gate pending
Last activity: 2026-06-18 — UNIFY 01-01: SUMMARY reconciled (AC-1..AC-4 Pass); PR #1 merge gate next
Next action: Merge PR #1, then transition phase 01 → 02

Progress:
- Milestone: [░░░░░░░░░░] 0% (0 of ~9 phases)
- Phase 1: UNIFY complete (merge gate + transition pending)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Phase 1 reconciled — merge gate + transition pending]
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

Last session: 2026-06-18 — Phase 1 APPLY + UNIFY complete
Stopped at: 01-01-SUMMARY.md written (AC-1..AC-4 Pass); awaiting PR #1 merge + phase transition
Next action: Merge PR #1 (CI gate), then transition phase 01 → 02
Resume file: (none — superseded by SUMMARY)
Resume context:
- Tool-activation risk fully de-risked; recipe documented in FINDINGS.md.
- PR: https://github.com/coctostan/pi-watch/pull/1 (feature/01-tool-activation-spike → main).

---
*STATE.md — Updated after every significant action*
