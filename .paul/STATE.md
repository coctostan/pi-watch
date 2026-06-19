# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-18 10:13:09)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Phase 5 (watch tool primitive) ✅ complete — UNIFY closed (05-01); `watch` tool wires sample→route→walkTierChain, tier 3 live-verified. PR #6 awaiting merge gate. Next: Phase 6 (tier adapters).

## Current Position

Milestone: v0.1 Initial Release
Phase: 05-watch-tool-primitive
Plan: 05-01 (watch tool primitive)
Status: UNIFY complete — Phase 5 closed; awaiting merge gate + Phase 6 planning
Last activity: 2026-06-19 — Phase 5 UNIFY complete (05-01-SUMMARY.md written; all AC PASS; 73/73 green; 0 vulns). Loop closed; Phase 5 = last/only plan → transition to Phase 6.
Next action: merge PR #6 (UNIFY merge gate), then /paul:plan for Phase 6 (tier adapters)

Progress:
- Milestone: [█████░░░░░] ~56% (5 of ~9 phases complete)
- Phase 1: ✅ complete (PR #1 merged)
- Phase 2: ✅ complete (02-01; PR #2 merged)
- Phase 3: ✅ complete (03-01 + 03-02; PR #4 merged 2f9f669)
- Phase 4: ✅ complete (04-01 Router; PR #5 merged f9c558f; 64/64 green)
- Phase 5: ✅ complete (05-01; UNIFY closed; PR #6 open, merge gate pending)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Phase 5 / 05-01: loop closed → merge PR #6, then /paul:plan Phase 6]
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
- (Phase 4) Router is a pure decision unit that emits an ordered tier chain ("route, don't answer"); the watch tool walks it + owns confidence-based escalation. Policy: spoken+transcript → [1,2,3]; else → [2,3]; on-screen-text → resolution "high"; every chain ends in tier 3.
- (Phase 5, checkpoint:decision) ExtensionAPI type source → option-a: real `@earendil-works/pi-coding-agent` types (not a hand-rolled shim). Placed in `peerDependencies: "*"` per docs/packages.md (pi-bundled package) + a devDep pin (^0.79.8) for local build/CI. Type-only import (erased under verbatimModuleSyntax); never enters runtime `dependencies`.
- (Phase 5) Tier 3 hands sampled frames to the orchestrator as pi tool-result ImageContent on a shared timeline; tier-runner.ts is pure/pi-free (local content union), extension.ts is the effect boundary. `watch` registered synchronously with mandatory promptSnippet; shipped via `pi.extensions` manifest.

### Deferred Issues
- Tier-3 batch via subagent fan-out (only needed for frames-for-many-videos).
- Optional Gemini tier-2 upgrade (only if a key is added).

### Blockers/Concerns
- RESOLVED (Phase 1): the print-mode "tool not found" symptom was the `pi-loadout` governor stripping newly-registered tools from the active set — not pi/-e/print. Custom-tool activation works in all modes. Phase-5 carry: ship `watch` as an installed package and ensure it's in the active loadout. See spikes/01-tool-activation/FINDINGS.md.

## Session Continuity

Last session: 2026-06-19 — Phase 5 UNIFY complete (05-01); loop closed, SUMMARY written
Stopped at: 05-01 UNIFY complete (PLAN ✓ / APPLY ✓ / UNIFY ✓) — PR #6 open, merge gate pending
Next action: merge PR #6 (UNIFY merge gate), then /paul:plan for Phase 6 (tier adapters)
Resume file: .paul/phases/05-watch-tool-primitive/05-01-SUMMARY.md (HANDOFF consumed; loop closed)
Resume context:
- Phase 5 watch tool primitive shipped: src/watch/{tier-runner.ts, extension.ts, index.ts} + test/watch/tier-runner.test.ts. Suite 73/73 green (prior 64 + 9 new); npm audit 0 vulns.
- Tier 3 (frames-into-context) fully implemented + live-verified (red→green→blue on a 3-scene clip via `pi --no-extensions -e ./dist/watch/extension.js`); tiers 1–2 are null-returning escalating stubs (real adapters = Phase 6).
- Deviation for UNIFY: registerTool pinned `TDetails` to `Record<string, unknown>` so execute success/error branches share one details shape (minor, in-scope).
- checkpoint:decision RESOLVED → option-a (see Decisions). Added @earendil-works/pi-coding-agent (peerDependencies "*" + devDep pin); typebox unchanged.
- Carries for UNIFY/later: (1) installed `watch` must be enabled in the active loadout or a setActiveTools governor strips it (FINDINGS #4); (2) DAVE — still no .github/workflows/ci.yml (only Socket Security on PRs); (3) DOCS — `typebox` sits in `dependencies` though it is a pi-bundled package (could move to peer); (4) `.paul/*` lifecycle artifacts + SUMMARY commit happen at plan completion (after UNIFY).
- Import, don't modify: src/contract/*, src/sampler/*, src/router/* stayed stable (consumed only). Transcript still ships "none" (best-effort).

### Git State
Last commit: 2b01e05 (chore(05-01): declare pi extension entry + peer dep)
Branch: feature/05-watch-tool-primitive (ahead 3 / behind 0 vs main); PR #6 OPEN, MERGEABLE
Feature branches merged: PR #1 (01), PR #2 (02), PR #3 (03-01 → 82aff62), PR #4 (03-02 → 2f9f669), PR #5 (04-01 → f9c558f)

---
*STATE.md — Updated after every significant action*
