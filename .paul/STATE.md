# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-24 after Phase 10)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** v0.2 — Tier 2, For Real. Phase 11 PLAN is created to prove the live tier-2 wire shape through the actual adapter path against the local Qwen3-VL endpoint.

## Current Position

Milestone: v0.2 — Tier 2, For Real
Phase: 12 of 13 (Tier-2 failure diagnostics)
Plan: Not started
Status: Phase 11 complete. Added opt-in live tier-2 Vitest proof, verified `buildTier2Request`/`parseTier2Answer` against local Qwen3-VL via `mlx_vlm.server`, documented the `WATCH_TIER2_LIVE=1` command, and opened PR #13 for merge. Ready to plan Phase 12 diagnostics after merge gate completes.
Last activity: 2026-06-24 — Phase 11 unified: 11-01 SUMMARY created, quality/CODI history updated, and transition routed toward Phase 12 planning.
Next action: /paul:plan for Phase 12

Progress:
- Milestone v0.2: [█████░░░░░] 50% (2 of 4 phases complete)
- Phase 10: Stand up the model — ✅ complete (10-01)
- Phase 11: Tier-2 live wire-shape proof — ✅ complete (11-01)
- Phase 12: Tier-2 failure diagnostics — ready to plan
- Phase 13: Tier-2 config UX — not started
- v0.1 Initial Release: ✅ complete (9 of 9 phases; PRs #1–#11 merged; final 6bf2270)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Phase 12 ready to plan]
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

Last session: 2026-06-24 — Phase 11 UNIFY completed and transition routed toward Phase 12 planning.
Stopped at: Phase 12 (Tier-2 failure diagnostics) ready to plan after PR #13 merge gate completes.
Next action: /paul:plan for Phase 12
Resume file: .paul/phases/11-tier2-live-proof/11-01-SUMMARY.md
wip_result: pushed — feature branch `feature/11-tier2-live-proof` pushed and PR #13 opened.
Resume context:
- Phase 11 is complete: `test/watch/tier2.live.test.ts` proves the real tier-2 wire shape against local Qwen3-VL when `WATCH_TIER2_LIVE=1` and skips by default.
- The live proof passed against `http://localhost:8080/v1` with `mlx-community/Qwen3-VL-8B-Instruct-4bit`; no production adapter changes were needed.
- `docs/TIER2-SETUP.md` documents the opt-in command and default-skip behavior; Phase 12 should focus on surfacing diagnostics for unconfigured/bad-status/parse-fail/timeout tier-2 failures.

### Git State
Last commit: c8538f1 (docs(11-01): document live tier-2 proof), on feature/11-tier2-live-proof after APPLY task commits 432b843 + c8538f1
Branch: feature/11-tier2-live-proof pushed to origin; PR #13 open: https://github.com/coctostan/pi-watch/pull/13; mergeStateStatus=CLEAN; status checks not yet reported (`statusCheckRollup=[]`).
Feature branches merged: PR #1 (01), PR #2 (02), PR #3 (03-01 → 82aff62), PR #4 (03-02 → 2f9f669), PR #5 (04-01 → f9c558f), PR #6 (05-01 → d355a91), PR #7 (06-01 → 0bd585a), PR #8 (06-02 → 0bd585a), PR #9 (07-01 → 7745f07), PR #10 (08-01 → 0c26401), PR #11 (09-01 → 6bf2270), PR #12 (10-01 → cdf3db2)

---
*STATE.md — Updated after every significant action*
