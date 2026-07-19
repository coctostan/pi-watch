# Project State

## Project Reference

See: .paul/PROJECT.md (v0.2 release baseline; v0.3 milestone active)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** v0.3 — Paste and Watch. Phase 14 will add a bounded YouTube source-resolution boundary so pasted URLs become local sampler inputs without changing local-file behavior.

## Current Position

Milestone: v0.3 — Paste and Watch
Version: v0.3.0 target (package remains released at 0.2.0 until milestone completion)
Phase: 14 of 16 (YouTube source resolution)
Plan: `.paul/phases/14-youtube-source-resolution/14-01-PLAN.md`
Status: UNIFY reconciled — all acceptance criteria pass and SUMMARY is drafted; post-unify reporting and GitHub Flow merge gate remain.
Last activity: 2026-07-10 — reconciled Phase 14 plan vs actual, documented two review-driven hardening fixes, and created `14-01-SUMMARY.md`.
Next action: finalize post-unify reports, then complete PR #16 merge gate

Progress:
- Milestone v0.3: [░░░░░░░░░░] 0% (0 of 3 phases complete)
- Phase 14: YouTube source resolution — 🟣 UNIFY reconciled; merge/transition pending (PR #16)
- Phase 15: Caption transcript pipeline — not started
- Phase 16: End-to-end URL UX — not started
- Milestone v0.2: [██████████] 100% ✓
- Milestone v0.1: [██████████] 100% ✓

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Phase 14: loop reconciled; merge/transition pending]
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
- (v0.3 discussion) URL scope is YouTube-first behind a generic resolver seam; captions (human or auto-generated) make tier 1 real; Whisper/local ASR is deferred; missing captions degrade to existing visual tiers.

### Deferred Issues
- Tier-3 batch via subagent fan-out (only needed for frames-for-many-videos).
- Optional Gemini tier-2 upgrade (only if a key is added).

### Blockers/Concerns
- No current blockers. PR #16 is open/mergeable with Socket checks passing. Download-size limiting remains explicitly outside Phase 14 scope; captions and live URL UX remain Phases 15–16.

## Session Continuity

Last session: 2026-07-10 — reconciled Phase 14 and drafted the finalized plan summary.
Stopped at: UNIFY reconciliation complete; post-unify reports and GitHub Flow merge gate pending.
Next action: finalize post-unify reports, then complete PR #16 merge gate
wip_result: implementation commits are pushed; UNIFY lifecycle/history artifacts are local and will be committed before the merge gate; `.codegraph/` remains local-only
Resume file: .paul/phases/14-youtube-source-resolution/14-01-SUMMARY.md
Resume context:
- TDD commits: RED `c081b98`, GREEN `0eed207`, REFACTOR `ce649d7`; post-review fixes `3e62ba4` (dual-error preservation) and `b3ff94e` (`yt-dlp --ignore-config`).
- Implemented exact supported YouTube classification/canonicalization, bounded argv-only `yt-dlp`, owned temp paths, original-ref preservation, and cleanup across success/failure.
- Verification: 171 passed / 0 failed / 1 skipped; targeted 29 passed; typecheck/build pass; npm audit 0 vulnerabilities; no dependency/contract/watch/router/config/docs changes.
- Module enforcement passed. Advisory cleanup warning was fixed; independent reviewer hardening finding was fixed. Codex adversarial review was unavailable due expired auth.
- PR: https://github.com/coctostan/pi-watch/pull/16 — open, mergeable, 0 behind / 5 ahead, Socket checks passing.

### Git State
Last release commit: 427f5a4; annotated tag `v0.2.0` points to it.
Branch: `feature/14-youtube-source-resolution`, 0 behind / 5 ahead of origin/main.
PR #16: https://github.com/coctostan/pi-watch/pull/16 — OPEN, mergeable; Socket Security Project Report and Pull Request Alerts passing.

---
*STATE.md — Updated after every significant action*
