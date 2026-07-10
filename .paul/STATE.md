# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-07-10 after Phase 13 / v0.2 completion)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** v0.2 is complete, archived, and ready for release tagging; no phase is active while the next milestone is defined.

## Current Position

Milestone: Awaiting next milestone
Version: v0.2.0
Phase: None active
Plan: None
Status: Milestone v0.2 — Tier 2, For Real complete and archived. Four phases / four plans shipped; package version aligned to 0.2.0; permanent record in `.paul/MILESTONES.md`; release tag `v0.2.0` is the milestone completion target.
Last activity: 2026-07-10 — v0.2 milestone finalized, archived, and package version aligned.
Next action: /paul:discuss-milestone to define the next milestone

Progress:
- Milestone v0.2: [██████████] 100% ✓ (4 phases, 4 plans)
- Milestone v0.1: [██████████] 100% ✓ (9 phases)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Milestone complete — ready for next]
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
- (Phase 7) Tool config = pure `resolveWatchConfig` over env + explicit overrides (precedence overrides > env > defaults), composed at the effect boundary; tier-2 fetch carries a configurable AbortSignal timeout (abort → null escalate).
- (Phase 8) The `/watch` command is a thin UX wrapper: pure parse/prompt/run core + injected effects (`ctx.ui.notify`, `pi.sendUserMessage`), `pi.registerCommand` synchronous alongside the tool. Decision (option-a): it DELEGATES to the agent rather than running the pipeline in the handler — the only path that preserves tier 3 (frames → orchestrator).
- (Phase 9 checkpoint:decision) Batch surface = option-a: add a new `watch_batch` tool over a pure `runWatchBatch` core; tiers 1/2 aggregate into one bounded text result, tier-3 batch is deferred to single-video watch follow-up calls (no subagent fan-out in v0.1).
- (Phase 10 checkpoint:decision) Local tier-2 default = `mlx-community/Qwen3-VL-8B-Instruct-4bit` first: verified reachable, ~5.38 GiB weights vs ~17.01 GiB for 30B-A3B, fastest low-risk path to a running endpoint; model remains swappable by config.
- (Phase 11) Live tier-2 model tests are opt-in/default-skipped (`WATCH_TIER2_LIVE=1`) and must use the production `buildTier2Request` / `parseTier2Answer` path, not model-specific request branches.
- (Phase 12 checkpoint:decision) Tier-2 failure diagnostics use option-a: an optional `onDiagnostic` boundary collector built fresh per call / per batch item, merged into `details.tier2` by a pure helper only when the final tier ≠ 2 — NOT a widening of the `null === escalate` tier-walk contract. `tier-runner.ts` stays byte-for-byte unchanged; diagnostics are secret-free.
- (Phase 13 checkpoint:decision) Config UX uses option-b: append a secret-free hint only to single-video `watch` when tier 2 was unconfigured and another tier answered; `WATCH_TIER2_LOCAL=1` opts into the documented localhost mlx_vlm endpoint, explicit URL/model wins, and the no-flag default stays network-free.

### Deferred Issues
- Tier-3 batch via subagent fan-out (only needed for frames-for-many-videos).
- Optional Gemini tier-2 upgrade (only if a key is added).

### Blockers/Concerns
- No current blockers. Carry for next milestone: dedicated CI workflow (merge gate is Socket-only), live pi runtime smoke for watch/watch_batch, tier-3 batch fan-out, richer command/config surfaces, optional TypeBox peer-dependency cleanup.

## Session Continuity

Last session: 2026-07-10 — v0.2 milestone completion ritual finalized.
Stopped at: v0.2 complete; permanent milestone log and roadmap archive created; package version aligned to 0.2.0; no active phase.
Next action: /paul:discuss-milestone to define the next milestone
wip_result: complete — 4 phases, 4 plans, 10 unique product/test/doc files; 152 passed / 1 skipped; build/typecheck/audit clean
Resume file: .paul/MILESTONES.md
Resume context:
- v0.2 archive: `.paul/archive/roadmap/v0.2.0-tier-2-for-real.md`; completed milestone log: `.paul/MILESTONES.md`.
- Tier 2 is locally runnable, production-wire proven, failure-diagnosable, and equipped with opt-in local config UX; the model backend remains a thin OpenAI-compatible adapter.
- Carry forward: dedicated CI, live pi runtime smoke, tier-3 batch fan-out, richer command/config surfaces, optional TypeBox peer cleanup, optional cloud tier.

### Git State
Milestone completion commit: release/tag target for `v0.2.0` on `main`.
Branch: `main`; completion commit and annotated `v0.2.0` tag are configured to push to origin.
Feature branches merged through PR #15; v0.2 implementation merge commit: 6f26a6f.

---
*STATE.md — Updated after every significant action*
