# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-18 10:13:09)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Phase 2 (Sampler data contract) — plan 02-01 created, APPLY next

## Current Position

Milestone: v0.1 Initial Release
Phase: 02-sampler-data-contract
Plan: 02-01 (Sampler data contract) — created, awaiting approval
Status: Planned (PLAN ✓); checkpoint:decision on toolchain pending at APPLY
Last activity: 2026-06-18 — Phase 2 plan 02-01 created
Next action: /paul:apply .paul/phases/02-sampler-data-contract/02-01-PLAN.md

Progress:
- Milestone: [█░░░░░░░░░] ~11% (1 of ~9 phases)
- Phase 1: ✅ complete (merged to main)
- Phase 2: 📋 planned (02-01) — not yet applied

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ○        ○     [Phase 2 plan 02-01 created; APPLY next]
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

Last session: 2026-06-18 — created Phase 2 plan 02-01 (sampler data contract)
Stopped at: PLAN ✓ for Phase 2; APPLY not started (awaiting approval)
Next action: /paul:apply .paul/phases/02-sampler-data-contract/02-01-PLAN.md
Resume file: .paul/HANDOFF-2026-06-18-phase2-ready.md (consumed — plan now exists)
wip_result: skipped (clean tree; untracked spike report JSONs only)
Resume context:
- Plan 02-01 bootstraps first production TS (package.json/tsconfig/test runner) + the WatchedFrameSet contract + toOpenAIContent serializer.
- autonomous:false — Task 1 is a checkpoint:decision on the toolchain (recommended: Vitest + TypeBox) per AGENTS.md "ask before adding deps."
- github-flow: APPLY should open a feature branch (e.g. feature/02-sampler-data-contract) → PR → CI gate before Phase 3.

### Git State
Last commit: 045bd03 (main)
Branch: main
Feature branches merged: feature/01-tool-activation-spike (PR #1, squash, deleted)

---
*STATE.md — Updated after every significant action*
