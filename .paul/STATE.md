# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-07-10 after Phase 13 / v0.2 completion)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** v0.2 — Tier 2, For Real is complete. All four phases shipped and PR #15 merged; ready to choose the next milestone.

## Current Position

Milestone: v0.2 — Tier 2, For Real
Phase: 13 of 13 (Tier-2 config UX)
Plan: 13-01 complete — .paul/phases/13-tier2-config-ux/13-01-SUMMARY.md
Status: Milestone v0.2 complete. Phase 13 AC-1..AC-5 PASS under option-b; PR #15 squash-merged as 6f26a6f. Tier 2 now has local setup, live wire proof, structured failure diagnostics, and actionable config UX. 152 passed/1 skipped; build/typecheck/audit clean.
Last activity: 2026-07-10 — PR #15 merged; Phase 13 and milestone v0.2 transitioned to complete.
Next action: /paul:milestone to start the next milestone

Progress:
- Milestone v0.2: [██████████] 100% (4 of 4 phases complete)
- Phase 10: Stand up the model — ✅ complete (10-01)
- Phase 11: Tier-2 live wire-shape proof — ✅ complete (11-01)
- Phase 12: Tier-2 failure diagnostics — ✅ complete (12-01; PR #14 merged → ffe07b3)
- Phase 13: Tier-2 config UX — ✅ complete (13-01; PR #15 merged → 6f26a6f)
- v0.1 Initial Release: ✅ complete (9 of 9 phases; PRs #1–#11 merged; final 6bf2270)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Phase 13 complete — v0.2 milestone complete]
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

Last session: 2026-07-10 — Phase 13 UNIFY, PR #15 merge gate, and v0.2 transition completed.
Stopped at: v0.2 milestone complete on synced `main`; all four milestone phases unified and merged.
Next action: /paul:milestone to start the next milestone
wip_result: complete — Phase 13 task commits 4934054 / 1e1647a, UNIFY metadata 70e89c4, squash merge 6f26a6f
Resume file: .paul/ROADMAP.md
Resume context:
- Phase 12 shipped structured tier-2 failure diagnostics: `createTier2Runner` now emits a `Tier2Diagnostic` (`unconfigured` / `http-error`+status / `empty-answer` / `timeout` / `network-error`) via an optional `onDiagnostic` side channel; the extension surfaces it as `details.tier2` on watch + watch_batch when tier 3 (or 1) answers. null→tier-3 escalation and the model-agnostic adapter are unchanged.
- Phase 13 shipped a secret-free `TIER2_UNCONFIGURED_HINT` plus pure `withUnconfiguredHint`, appended only to single-video `watch` when tier 2 was unconfigured and another tier answered.
- Task 1 checkpoint:decision RESOLVED → option-b (message + opt-in `WATCH_TIER2_LOCAL=1` localhost default). `resolveTier2ConfigFromEnv` now resolves the flag to `http://localhost:8080/v1` + `mlx-community/Qwen3-VL-8B-Instruct-4bit`; explicit `WATCH_TIER2_BASE_URL`/`MODEL` win; default (flag unset/other) stays network-free `null`.
- Final results: 152 passed / 1 skipped; build, typecheck, and audit clean. `tier-runner.ts` and dependencies unchanged. Minor in-scope barrel re-export documented in SUMMARY. `.codegraph/` remains an untracked local-only CODI artifact.
- Scope guards held: tier-runner.ts byte-for-byte unchanged; Phase-12 `null===escalate` + `details.tier2` contract additive only; watch_batch keeps structured per-item details (no aggregated hint); no new deps; no secrets in any message/constant.

### Git State
Last commit: 6f26a6f (Phase 13-01: Tier-2 config UX (#15)), on main
Branch: main synced with origin/main; PR #15 squash-merged and feature/13-tier2-config-ux deleted; CI green (Socket Security Project Report + Pull Request Alerts).
Feature branches merged: PR #1 (01), PR #2 (02), PR #3 (03-01 → 82aff62), PR #4 (03-02 → 2f9f669), PR #5 (04-01 → f9c558f), PR #6 (05-01 → d355a91), PR #7 (06-01 → 0bd585a), PR #8 (06-02 → 0bd585a), PR #9 (07-01 → 7745f07), PR #10 (08-01 → 0c26401), PR #11 (09-01 → 6bf2270), PR #12 (10-01 → cdf3db2), PR #13 (11-01 → 8e74f45), PR #14 (12-01 → ffe07b3), PR #15 (13-01 → 6f26a6f)

---
*STATE.md — Updated after every significant action*
