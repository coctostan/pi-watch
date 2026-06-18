# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-18 10:13:09)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Project initialized — ready for planning

## Current Position

Milestone: v0.1 Initial Release (created during init)
Phase: Not yet defined
Plan: None yet
Status: Ready to create roadmap and first PLAN
Last activity: 2026-06-18 10:13:09 — Project initialized

Progress:
- Milestone: [░░░░░░░░░░] 0%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Ready for first PLAN]
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
- Print-mode tool-activation gotcha: custom tools registered by a `pi -e ext.ts` extension did not enter the active tool set in print mode during spike #1. Must resolve when wiring the real `watch` tool.

## Session Continuity

Last session: 2026-06-18 10:13:09
Stopped at: Project initialization complete
Next action: Run /paul:plan to define phases and first plan for v0.1
Resume file: .paul/PROJECT.md

---
*STATE.md — Updated after every significant action*
