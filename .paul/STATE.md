# Project State

## Project Reference

See: .paul/PROJECT.md (v0.2 release baseline; v0.3 milestone active)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** v0.3 — Paste and Watch. Phases 14–15 are complete; Phase 16 acceptance criteria are reconciled and UNIFY post-hooks/GitHub Flow closure are in progress.

## Current Position

Milestone: v0.3 — Paste and Watch
Version: v0.3.0 target (package remains released at 0.2.0 until milestone completion)
Phase: 16 of 16 (End-to-end URL UX)
Plan: 16-01 — `.paul/phases/16-end-to-end-url-ux/16-01-PLAN.md`
Status: UNIFY in progress — reconciliation complete; post-unify reports and lifecycle merge gate pending
Last activity: 2026-08-09 — Phase 16 SUMMARY created and final quality gates passed; PR #18 had already merged before UNIFY metadata finalization.
Next action: Finalize post-unify reports and merge lifecycle artifacts through GitHub Flow.

Progress:
- Milestone v0.3: [███████░░░] 67% (2 of 3 phases complete)
- Phase 14: YouTube source resolution — ✅ complete (14-01, PR #16)
- Phase 15: Caption transcript pipeline — ✅ complete (15-01, PR #17)
- Phase 16: End-to-end URL UX — 🟠 UNIFY in progress (implementation PR #18 merged; lifecycle closure pending)
- Milestone v0.2: [██████████] 100% ✓
- Milestone v0.1: [██████████] 100% ✓

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ○     [Phase 16: reconciliation complete; post-unify reports and merge gate pending]
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
- (Phase 16 plan review, user-approved) Documentation must use verified Git/local-path Pi package installation and warn against `npm:pi-watch`, which resolves to an unrelated registry package; npm rename/publication is outside Phase 16.
- (Phase 16 plan review, user-approved) One observed passing `WATCH_YOUTUBE_LIVE=1` run is mandatory before completion; if APPLY cannot obtain it because of prerequisites or network access, stop at a dynamic blocking human-verification checkpoint rather than record an exception.
- (Phase 16 plan review, user-approved) Add exactly `"prepare": "npm run build"` to `package.json` so Pi Git installation's `npm install` creates ignored `dist/watch/extension.js`; do not add dependencies, change the package name, modify the lockfile, or commit build output.
- (Phase 16 APPLY checkpoint, user-approved) The prepare-only decision is superseded by option A after Pi-equivalent clean installs proved dev-only build tooling unavailable: commit exact `npm run build` output under `dist/**`, add no prepare/install hook or dependencies, and keep `package.json`/lockfile unchanged.
- (Phase 16 APPLY audit checkpoint, user-approved) Accept the 0/3/2 → 0/4/2 audit delta as an external advisory-feed deviation: the added `nanoid` highs are in the unchanged dev dependency tree, Phase 16 changed no manifest/lock/dependency, and zero critical findings remain. Track dependency maintenance separately rather than widening release UX scope.

### Deferred Issues
- Tier-3 batch via subagent fan-out (only needed for frames-for-many-videos).
- Optional Gemini tier-2 upgrade (only if a key is added).
- Optional resolver download filesize/duration caps if Phase-16 live runtime evidence warrants them.
- Scoped npm package rename/publication for pi-watch; the unscoped registry name currently belongs to an unrelated package.

### Blockers/Concerns
- Resolved APPLY concern: prepare-only clean Git installation failed under Pi's `npm install --omit=dev`; user approved committed `dist/**` output with no manifest/dependency/lockfile changes.
- Resolved by user override: `npm audit --json` is 0 critical / 4 high / 2 moderate versus pre-plan 0/3/2; added `nanoid` advisories are external and in the unchanged dev tree.
- Phase 16 UNIFY: PR #18 merged before SUMMARY/lifecycle metadata were finalized; close through a follow-up GitHub Flow PR so durable artifacts reach `main`.

## Session Continuity

Last session: 2026-08-09 — Phase 16 UNIFY reconciliation and local quality confirmation completed.
Stopped at: Post-unify module reports and GitHub Flow lifecycle closure pending; implementation PR #18 is already merged.
Next action: Finalize post-unify reports and merge lifecycle artifacts through GitHub Flow.
wip_result: UNIFY artifacts are being finalized on the feature branch; implementation commits are merged in PR #18.
Resume file: .paul/phases/16-end-to-end-url-ux/16-01-SUMMARY.md
Resume context:
- All ACs reconcile PASS; Task 3 remains PASS_WITH_CONCERNS for the approved audit-feed deviation.
- Final local gates: 194 passed, 2 default-skipped; typecheck/build pass; generated `dist/**` unchanged.
- Mandatory live smoke passed during APPLY with public override `jNQXAC9IVRw`.
- PR #18 merged as `b207d66` before UNIFY metadata finalization, requiring a follow-up lifecycle PR.

### Git State
Implementation merge: PR #18 squash commit `b207d66`; release tag `v0.2.0` remains at `427f5a4`.
Branch: `feature/16-end-to-end-url-ux`; implementation content is merged to `origin/main`, while UNIFY lifecycle artifacts remain uncommitted. `.codegraph/` remains pre-existing and untouched.
PR: #18 merged — https://github.com/coctostan/pi-watch/pull/18. Both Socket Security checks passed; a follow-up lifecycle PR is required because UNIFY artifacts were not included before merge.

---
*STATE.md — Updated after every significant action*
