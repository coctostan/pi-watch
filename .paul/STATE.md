# Project State

## Project Reference

See: .paul/PROJECT.md (v0.2 release baseline; v0.3 milestone active)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** v0.3 — Paste and Watch. Phase 15 will fetch and parse YouTube captions into the existing transcript timeline so spoken-content questions can reach tier 1, with visual fallback when captions are absent.

## Current Position

Milestone: v0.3 — Paste and Watch
Version: v0.3.0 target (package remains released at 0.2.0 until milestone completion)
Phase: 15 of 16 (Caption transcript pipeline)
Plan: Not started
Status: Ready to plan. Phase 14 is complete and merged; Phase 15 owns caption fetch/parsing, tier-1 reachability, and visual fallback preservation.
Last activity: 2026-07-10 — completed Phase 14, merged PR #16 as `5fd4e37`, and transitioned to Phase 15.
Next action: /paul:plan for Phase 15

Progress:
- Milestone v0.3: [███░░░░░░░] 33% (1 of 3 phases complete)
- Phase 14: YouTube source resolution — ✅ complete (14-01, PR #16)
- Phase 15: Caption transcript pipeline — 🔵 ready to plan
- Phase 16: End-to-end URL UX — not started
- Milestone v0.2: [██████████] 100% ✓
- Milestone v0.1: [██████████] 100% ✓

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Phase 15: ready for first PLAN]
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
- (Phase 14) Source resolution separates caller `originalRef` from local `mediaRef`; only resolver-created directories are sampler-owned/removable, and dual primary/cleanup failures preserve both causes.
- (Phase 14) `yt-dlp` runs once through bounded argv-only execution with `--ignore-config`; local refs and existing contract/tier behavior remain unchanged.

### Deferred Issues
- Tier-3 batch via subagent fan-out (only needed for frames-for-many-videos).
- Optional Gemini tier-2 upgrade (only if a key is added).
- Optional resolver download filesize/duration caps if Phase-16 live runtime evidence warrants them.

### Blockers/Concerns
- No current blockers. Phase 15 must avoid duplicate media downloads, preserve Phase-14 ownership/cleanup, prefer human or auto-generated captions, and degrade to existing visual tiers without fabricating spoken content.

## Session Continuity

Last session: 2026-07-10 — completed and merged Phase 14, then transitioned to Phase 15.
Stopped at: Phase 14 complete; Phase 15 ready for its first PLAN.
Next action: /paul:plan for Phase 15
wip_result: Phase 14 merged and feature branch cleaned; Phase 15 is ready to plan on synced `main`; `.codegraph/` remains local-only
Resume file: .paul/ROADMAP.md
Resume context:
- Phase 14 shipped generic YouTube resolution, bounded/config-isolated `yt-dlp`, explicit temp ownership/cleanup, and original-ref preservation; record: `.paul/phases/14-youtube-source-resolution/14-01-SUMMARY.md`.
- Quality baseline is now 171 passing / 0 failing / 1 skipped; typecheck/build/audit passed.
- Phase 15 scope: fetch human or auto-generated captions, parse timestamped segments into the existing timeline, make tier 1 reachable, and preserve visual fallback when captions are unavailable.
- Preserve the Phase-14 rule: `mediaRef` is for ffprobe/ffmpeg; `originalRef` is the YouTube page ref for caption lookup and source metadata.

### Git State
Last merged phase commit: `5fd4e37` (PR #16 squash merge); release tag `v0.2.0` remains at `427f5a4`.
Branch: `main`, 0 behind / 0 ahead of origin/main.
PR #16: https://github.com/coctostan/pi-watch/pull/16 — MERGED; Socket checks passed; feature branch cleaned.

---
*STATE.md — Updated after every significant action*
