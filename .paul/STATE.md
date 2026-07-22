# Project State

## Project Reference

See: .paul/PROJECT.md (v0.2 release baseline; v0.3 milestone active)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** v0.3 — Paste and Watch. Plan 15-01 reconciliation is complete; PR #17 must pass the GitHub Flow merge gate before Phase 15 can transition to end-to-end URL UX.

## Current Position

Milestone: v0.3 — Paste and Watch
Version: v0.3.0 target (package remains released at 0.2.0 until milestone completion)
Phase: 15 of 16 (Caption transcript pipeline)
Plan: 15-01 UNIFY reconciled — `.paul/phases/15-caption-transcript-pipeline/15-01-SUMMARY.md`
Status: SUMMARY finalized on `feature/caption-transcript-pipeline`; PR #17 merge gate pending.
Last activity: 2026-07-22 — reconciled Plan 15-01; all five acceptance criteria pass with 189 passing / 0 failing / 1 skipped, typecheck/build pass, audit unchanged.
Next action: Complete PR #17 CI/merge gate, then transition Phase 15 to Phase 16.

Progress:
- Milestone v0.3: [███░░░░░░░] 33% (1 of 3 phases complete)
- Phase 14: YouTube source resolution — ✅ complete (14-01, PR #16)
- Phase 15: Caption transcript pipeline — 🟣 UNIFY reconciled, merge gate pending (15-01, PR #17)
- Phase 16: End-to-end URL UX — not started
- Milestone v0.2: [██████████] 100% ✓
- Milestone v0.1: [██████████] 100% ✓

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ◐     [Phase 15, Plan 15-01: reconciliation complete; merge gate pending]
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
- (Phase 15) Caption lookup uses bounded subtitle-only `yt-dlp`: human captions first, one automatic-caption fallback, deterministic owned VTT discovery, and a 16 MiB pre-read file cap; every failure degrades to `none`.
- (Phase 15 review recovery, user-approved) `mergeTranscript()` drops cues starting at/after media duration so caption timing can never violate `endMs >= startMs`; WebVTT text decodes the six standard cue character references.

### Deferred Issues
- Tier-3 batch via subagent fan-out (only needed for frames-for-many-videos).
- Optional Gemini tier-2 upgrade (only if a key is added).
- Optional resolver download filesize/duration caps if Phase-16 live runtime evidence warrants them.

### Blockers/Concerns
- No UNIFY blocker remains. ARCH/RUBY advise a future focused split because `src/sampler/effects.ts` exceeds 600 lines. Audit remains 0 critical / 1 high / 1 moderate with no new findings. PR #17 merge gate is pending.

## Session Continuity

Last session: 2026-07-22 — finalized Plan 15-01 reconciliation and post-UNIFY evidence.
Stopped at: SUMMARY finalized; PR #17 GitHub Flow merge gate pending.
Next action: Complete PR #17 CI/merge gate, then transition to Phase 16.
wip_result: not needed — implementation is committed/pushed; UNIFY metadata is ready to commit and push.
Resume file: .paul/phases/15-caption-transcript-pipeline/15-01-SUMMARY.md
Resume context:
- Commits: RED `44ab797`, GREEN `5bd06ca`, REFACTOR `06b5556`, entity fix `3760550`, review RED `f2ca5f1`, timeline/size fix `36dad7a`.
- Final verification: 189 passing / 0 failing / 1 skipped; typecheck/build pass; audit unchanged at 0 critical / 1 high / 1 moderate.
- User-approved deviation added `src/sampler/assemble.ts` and `test/sampler/assemble.test.ts`; no dependency, contract, router, watch, config, docs, `sample.ts`, or generated-source change.
- Module evidence: WALT/DEAN/TODD/SETH/OMAR/PETE/REED pass; IRIS finding fixed; ARCH future-split warning only; final independent review found no blocking issue.

### Git State
Last merged phase commit: `5fd4e37` (PR #16 squash merge); release tag `v0.2.0` remains at `427f5a4`.
Branch: `feature/caption-transcript-pipeline`, created from current `main` (0 behind / 0 ahead of origin/main at preflight).
PR #17: https://github.com/coctostan/pi-watch/pull/17 — OPEN; branch pushed; Socket checks passing at APPLY postflight.

---
*STATE.md — Updated after every significant action*
