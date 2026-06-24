# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-24 after Phase 10)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** v0.2 — Tier 2, For Real. Phase 12 PLAN (12-01) is created to surface structured tier-2 failure diagnostics into the watch tool `details` while preserving the null→tier-3 escalation behavior.

## Current Position

Milestone: v0.2 — Tier 2, For Real
Phase: 12 of 13 (Tier-2 failure diagnostics)
Plan: 12-01 UNIFY complete (SUMMARY written; merge gate next) — .paul/phases/12-tier2-failure-diagnostics/12-01-SUMMARY.md
Status: Phase 12 UNIFY complete. SUMMARY reconciled all 4 ACs PASS (option-a boundary collector; structured Tier2Diagnostic → details.tier2; tier-runner.ts byte-for-byte unchanged). Quality ▲ (+14 tests, 125→139). Awaiting github-flow merge gate for PR #14 before phase transition (Phase 12 is the only plan in the phase).
Last activity: 2026-06-24 — Phase 12 UNIFY: wrote 12-01-SUMMARY.md, appended QUALITY/CODI history rows; next is PR #14 merge gate + phase transition.
Next action: merge PR #14 (CI-gated), then transition Phase 12 → Phase 13

Progress:
- Milestone v0.2: [█████░░░░░] 50% (2 of 4 phases complete)
- Phase 10: Stand up the model — ✅ complete (10-01)
- Phase 11: Tier-2 live wire-shape proof — ✅ complete (11-01)
- Phase 12: Tier-2 failure diagnostics — 🚧 UNIFY complete (12-01; PR #14 merge gate pending)
- Phase 13: Tier-2 config UX — not started
- v0.1 Initial Release: ✅ complete (9 of 9 phases; PRs #1–#11 merged; final 6bf2270)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Phase 12: 12-01 UNIFY complete; PR #14 merge gate next]
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

### Deferred Issues
- Tier-3 batch via subagent fan-out (only needed for frames-for-many-videos).
- Optional Gemini tier-2 upgrade (only if a key is added).

### Blockers/Concerns
- No current blockers. Carry for next milestone: dedicated CI workflow (merge gate is Socket-only), live pi runtime smoke for watch/watch_batch, tier-3 batch fan-out, richer command/config surfaces, optional TypeBox peer-dependency cleanup.

## Session Continuity

Last session: 2026-06-24 — Phase 12 APPLY + UNIFY for 12-01 (checkpoint → option-a; 3 tasks committed; PR #14 opened; SUMMARY written).
Stopped at: Phase 12 UNIFY complete; awaiting PR #14 github-flow merge gate, then phase transition (12 → 13). All 4 ACs PASS; tier-runner.ts byte-for-byte unchanged.
Next action: merge PR #14 (CI-gated) and transition Phase 12 → Phase 13
Resume file: .paul/HANDOFF-2026-06-24-phase-12-apply-ready.md (consumed)
wip_result: skipped — base-branch in github-flow (`main`); pause artifacts are local/uncommitted (`.paul/STATE.md`, `.paul/ROADMAP.md`, `.paul/phases/12-tier2-failure-diagnostics/`); `.codegraph/` is untracked local-only
Resume context:
- Phase 11 is complete and merged: opt-in live tier-2 proof validates `buildTier2Request` → local `mlx_vlm.server` → `parseTier2Answer` against Qwen3-VL and skips by default without `WATCH_TIER2_LIVE=1`.
- `docs/TIER2-SETUP.md` documents the live proof command and local API-key guidance; no production tier-2 adapter change was needed.
- Phase 12 plan (12-01) surfaces structured tier-2 diagnostics (unconfigured / http-error / empty-answer / timeout / network-error) into watch + watch_batch `details`, with the null→tier-3 escalation invariant and model-agnostic adapter held fixed. The blocking checkpoint chooses option-a (onDiagnostic boundary collector, smallest blast radius) vs option-b (typed tier-walk result); option-a leaves tier-runner.ts + its tests unchanged.
- The pre-existing silent-null debt (deferred from Phase 11) is the explicit target; no new deps, no secrets in diagnostics.

### Git State
Last commit: 99192a5 (docs(12-01): document the tier-2 details.tier2 failure surface), on feature/12-tier2-failure-diagnostics
Branch: feature/12-tier2-failure-diagnostics pushed to origin; PR #14 OPEN + MERGEABLE: https://github.com/coctostan/pi-watch/pull/14; CI green (Socket Security Project Report + Pull Request Alerts). Created from main (synced). 12-01 task commits: 540bfed, 5f14bed, 99192a5. UNIFY owns the merge gate.
Feature branches merged: PR #1 (01), PR #2 (02), PR #3 (03-01 → 82aff62), PR #4 (03-02 → 2f9f669), PR #5 (04-01 → f9c558f), PR #6 (05-01 → d355a91), PR #7 (06-01 → 0bd585a), PR #8 (06-02 → 0bd585a), PR #9 (07-01 → 7745f07), PR #10 (08-01 → 0c26401), PR #11 (09-01 → 6bf2270), PR #12 (10-01 → cdf3db2), PR #13 (11-01 → 8e74f45)

---
*STATE.md — Updated after every significant action*
