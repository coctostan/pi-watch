# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-24 after Phase 10)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** v0.2 — Tier 2, For Real. The local Qwen3-VL endpoint is stood up; next prove the live tier-2 wire shape through the actual watch pipeline in Phase 11.

## Current Position

Milestone: v0.2 — Tier 2, For Real
Phase: 11 of 13 (Tier-2 live wire-shape proof)
Plan: Not started
Status: Phase 10 complete. Local `mlx_vlm.server` is running with `mlx-community/Qwen3-VL-8B-Instruct-4bit`; smoke POST returned HTTP 200 with non-empty answer (`red`); `docs/TIER2-SETUP.md` captures the reproducible runbook and WATCH_TIER2_* values. Ready to plan Phase 11.
Last activity: 2026-06-24 — Phase 10 unified: 10-01 SUMMARY created, quality/CODI history updated, and transition routed to Phase 11 planning. Server intentionally left running for Phase 11.
Next action: /paul:plan for Phase 11

Progress:
- Milestone v0.2: [██░░░░░░░░] 25% (1 of 4 phases complete)
- Phase 10: Stand up the model — ✅ complete (10-01)
- Phase 11: Tier-2 live wire-shape proof — ready to plan
- Phase 12: Tier-2 failure diagnostics — not started
- Phase 13: Tier-2 config UX — not started
- v0.1 Initial Release: ✅ complete (9 of 9 phases; PRs #1–#11 merged; final 6bf2270)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Phase 11 ready to plan]
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

### Deferred Issues
- Tier-3 batch via subagent fan-out (only needed for frames-for-many-videos).
- Optional Gemini tier-2 upgrade (only if a key is added).

### Blockers/Concerns
- No current blockers. Carry for next milestone: dedicated CI workflow (merge gate is Socket-only), live pi runtime smoke for watch/watch_batch, tier-3 batch fan-out, richer command/config surfaces, optional TypeBox peer-dependency cleanup.

## Session Continuity

Last session: 2026-06-24 — Phase 10 completed. Chose Qwen3-VL 8B 4-bit, provisioned uv-pinned Python 3.12 env outside the repo, started local mlx_vlm.server on port 8080, smoke-tested OpenAI image_url chat-completions wire shape, wrote docs/TIER2-SETUP.md, and unified 10-01.
Stopped at: Phase 10 complete; Phase 11 (Tier-2 live wire-shape proof) ready to plan. Local server left running for Phase 11.
Next action: /paul:plan for Phase 11
Resume file: .paul/ROADMAP.md
wip_result: phase-complete (10-01 summary: .paul/phases/10-standup-model/10-01-SUMMARY.md; implementation commit fc56c21; PR #12 checks passing: Socket Security report + alerts)
Resume context:
- v0.1 is complete: sampler contract, sampler implementation, router, `watch` tool primitive, tier adapters, config surface, `/watch` command, and `watch_batch` batching all shipped.
- We own sampling; tier-2 backends are thin OpenAI-compatible adapters (baseURL + model id), never code forks (AGENTS.md). Cloud (Gemini) optional, never required.
- Carries for future milestone: installed `watch`/`/watch` must be enabled in active loadout; add dedicated CI workflow; consider TypeBox peer-dep cleanup; deferred file-based config + tier-order override, `/watch` budget/resolution flags + autocomplete, `/watch-batch` command, and tier-3 subagent fan-out.

### Git State
Last commit: cdf3db2 (docs(10-01): document local tier-2 model setup), merged via PR #12
Branch: main synced with origin/main; PR #12 merged: https://github.com/coctostan/pi-watch/pull/12; checks passed: Socket Security Project Report + Pull Request Alerts
Feature branches merged: PR #1 (01), PR #2 (02), PR #3 (03-01 → 82aff62), PR #4 (03-02 → 2f9f669), PR #5 (04-01 → f9c558f), PR #6 (05-01 → d355a91), PR #7 (06-01 → 0bd585a), PR #8 (06-02 → 0bd585a), PR #9 (07-01 → 7745f07), PR #10 (08-01 → 0c26401), PR #11 (09-01 → 6bf2270), PR #12 (10-01 → cdf3db2)

---
*STATE.md — Updated after every significant action*
