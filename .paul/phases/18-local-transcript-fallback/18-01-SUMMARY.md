---
phase: 18-local-transcript-fallback
plan: 01
subsystem: sampler
tags: [asr, mlx-whisper, captions-first, local-first, tdd]
requires:
  - phase: 17-bounded-asr-foundation
    provides: observed mlx_whisper argv/JSON contract, bounded defaults, ownership policy, and TDD matrix
provides:
  - bounded local English ASR effect boundary with validated whisper segments
  - explicit opt-in ASR configuration with duration and timeout ceilings
  - captions-first spoken-intent transcript fallback for single and batch watch tools
affects:
  - local speech UX and proof
  - sampler
  - watch extension
tech-stack:
  added: []
  patterns: [pure-core explicit-effects ASR, captions-first fallback, extension-gated spoken intent]
key-files:
  created:
    - src/sampler/asr.ts
    - test/sampler/asr.test.ts
  modified:
    - src/sampler/sample.ts
    - src/config/config.ts
    - src/watch/extension.ts
key-decisions:
  - "Keep local ASR disabled unless WATCH_ASR_LOCAL is exactly 1 or an explicit config override is supplied."
  - "Run ASR only for spoken intent after captions are absent, and degrade every failure to visual tiers."
  - "Own only adapter-created output storage; media and package/model caches remain borrowed and user-managed."
patterns-established:
  - "Parse unknown mlx_whisper JSON in a pure function and keep process/filesystem work in a bounded effect shell."
  - "Surface only typed privacy-safe diagnostics; never include refs, transcript text, stderr, or cache paths."
duration: 56min
started: 2026-08-10T08:06:46-04:00
completed: 2026-08-10T09:02:54-04:00
---

# Phase 18 Plan 01: Bounded Captions-First Local ASR Fallback Summary

**Shipped an explicitly enabled, captions-first local English ASR fallback that turns bounded `mlx_whisper` JSON into timestamped tier-1 transcript segments while preserving visual fallback, privacy, and ownership on every failure.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | 56 minutes |
| Started | 2026-08-10T08:06:46-04:00 |
| Completed | 2026-08-10T09:02:54-04:00 |
| Tasks | 3 completed (REFACTOR reviewed and skipped as unnecessary) |
| Implementation files changed | 33 |

## Acceptance Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| AC-1: RED proves the complete local-ASR contract is absent | PASS | Test-only commit `7dd5d41` added 496 lines across four focused test files; the focused suite exited non-zero on the expected missing ASR module/config/composition behavior before production edits. |
| AC-2: GREEN ships bounded captions-first local transcript fallback | PASS | Commit `60d5310` implemented the parser, argv-only effect shell, bounded config, captions-first sampler composition, spoken-only extension gating, and private single/batch diagnostics. The focused suite, typecheck, and build passed without a real model or network call. |
| AC-3: REFACTOR preserves contracts and distributable output | PASS | Review found no behavior-preserving refactor necessary. Final APPLY verification passed with 245 tests / 2 skipped, typecheck, reproducible build, package dry-run, protected-file diff, whitespace checks, no residual ASR temp storage, and unchanged audit counts of 0 critical / 4 high / 2 moderate. |

## Spec Deltas and Routing

No deltas

## Module Execution Reports

[dispatch] pre-unify: 0 modules registered for this hook.

### WALT

**Status: PASS.** Post-unify computed its delta from APPLY-captured evidence without re-running checks: 210 passing tests before APPLY and 245 passing / 2 skipped after APPLY, with typecheck and build passing and no lint runner configured. Quality trajectory: improved by 35 passing tests with no regression. A normalized `18-01` row was appended to `.paul/QUALITY-HISTORY.md`.

### SKIP

**Status: NOTE.** Source-backed knowledge retained: local ASR is an explicit spoken-intent, caption-miss fallback; direct bounded `mlx_whisper` execution owns only adapter-created output; every failure remains private and visually degradable. Source: this SUMMARY, `Decisions Made`, backed by PLAN `<feature>` and APPLY evidence; date: 2026-08-10; type: decision; phase/plan: 18/18-01; context: adding local transcript acquisition without making model work or installation implicit; impact: Phase 19 can build setup, diagnostics UX, fixtures, and installed proof on the stable seam. No separate knowledge store was configured.

### CODI

**Status: SKIP.** PLAN evidence records `CODI: skipped — codegraph impact tools unavailable`; normalized outcome `skipped-tool-unavailable`, with no invented symbols or counts. A normalized `18-01` row was appended to `.paul/CODI-HISTORY.md`.

### RUBY

**Status: PASS.** No technical-debt concerns were found in the six changed readable source files. Measured sizes were 220 lines (`asr.ts`), 167 (`sample.ts`), 72 (`sampler/index.ts`), 183 (`config.ts`), 24 (`config/index.ts`), and 429 (`extension.ts`). The ASR change already uses the planned Extract Pure Core pattern, and extension additions remain narrowly compositional; no refactor is recommended.

[dispatch] post-unify: WALT PASS; SKIP NOTE; CODI skipped-tool-unavailable; RUBY PASS. No module blocked UNIFY.

## Accomplishments

- Added a pure `parseMlxWhisperJson` core that validates unknown JSON, drops invalid entries, preserves stable timestamp ordering, rounds to milliseconds, clamps ends to media duration, and never fabricates text from aggregate output.
- Added a bounded `fetchLocalAsrTranscript` effect shell using direct argv-only `execFile`, hard duration/timeout/output limits, exact regular-file validation, best-effort typed diagnostics, and exactly-once adapter-output cleanup.
- Added disabled-by-default local-ASR configuration with exact environment opt-in, explicit override precedence, safe field fallback, and non-increasable hard ceilings.
- Preserved captions first, used resolved local media only after a caption miss, and gated ASR policy at the extension for spoken intent in both single and batch tools.
- Generated and committed exact `dist/**` output for Git/local Pi installation without adding dependencies or installation hooks.

## Task and Verification Results

| Task | Commit | Result | Verification |
|------|--------|--------|--------------|
| Task 1: RED — specify bounded local-ASR contract | `7dd5d41` | PASS | Focused tests failed for the expected absent parser/process/config/gating behavior before production implementation. |
| Task 2: GREEN — implement minimal local transcript fallback | `60d5310` | PASS | Focused tests, typecheck, and build passed; all eligible and failure paths remained deterministic and offline. |
| Task 3: REFACTOR — preserve boundaries and prove distribution | skipped | PASS | Changed code was reviewed; no refactor was needed. Full verification and distribution gates passed. |
| Final APPLY gate | `60d5310` | PASS | 245 tests passed / 2 skipped; typecheck, reproducible build, package contents, protected contracts, whitespace, cleanup, and dependency baseline all passed. |

UNIFY independently re-ran `npm test`, `npm run typecheck`, `npm run build`, the clean generated-output check, `npm pack --dry-run`, protected-file checks, `git diff --check`, ASR temporary-storage cleanup, and `npm audit --json`; all gates passed with 245 tests / 2 skipped and an unchanged 0 critical / 4 high / 2 moderate audit baseline.

## Files Created/Modified

| File group | Change | Purpose |
|------------|--------|---------|
| `src/sampler/asr.ts` | Created | Pure JSON parser, typed ASR policy/diagnostics, bounded process/filesystem shell, and narrow ownership cleanup. |
| `src/sampler/sample.ts`, `src/sampler/index.ts` | Modified | Captions-first ASR composition and public boundary exports. |
| `src/config/config.ts`, `src/config/index.ts` | Modified | Explicit local-ASR opt-in, defaults, precedence, validation, and hard ceilings. |
| `src/watch/extension.ts` | Modified | Spoken-intent eligibility plus privacy-safe single/batch diagnostic collection. |
| `test/sampler/asr.test.ts` | Created | Parser, argv, bounds, failure taxonomy, privacy, callback, and cleanup coverage. |
| `test/sampler/sample.test.ts`, `test/config/config.test.ts`, `test/watch/extension.test.ts` | Modified | Captions-first composition, config, single/batch gating, fallback, and diagnostic coverage. |
| `dist/config/**`, `dist/sampler/**`, `dist/watch/**` | Generated/modified | Exact distributable JavaScript, declarations, and source maps for Git/local installation. |

The implementation changed every applicable planned file. `dist/watch/extension.d.ts` was listed conservatively but remained byte-identical because no exported declaration changed; its generated source map and JavaScript changed as expected.

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Require exact opt-in and spoken intent before passing an ASR policy | Local model work is expensive and must never become a hidden default. | Disabled, visual, on-screen-text, and captioned requests do not spawn ASR. |
| Keep captions ahead of ASR and preserve the existing tier walk | Captions remain the cheapest transcript source and all local failures must degrade safely. | Valid captions suppress ASR; failed ASR leaves native-video and frame tiers available. |
| Invoke configured `mlx_whisper` directly with bounded argv and output | Phase 17 observed this stable executable contract; embedding Python or hidden installation would expand scope and ownership. | The adapter stays thin, local, configurable, and independent of package/model cache management. |
| Separate pure parsing from process/filesystem effects | Unknown JSON validation is deterministic while execution and cleanup are explicit boundary effects. | Parser behavior is directly testable and effect failure handling remains narrow. |
| Emit narrow typed diagnostics only | Paths, transcript text, stderr, cache locations, and credentials are unnecessary and privacy-sensitive. | Single and batch expose actionable failure reasons without leaking media or model data. |

## Deviations from Plan

- REFACTOR was explicitly skipped after review because the implementation already followed the planned pure-core/effect-shell boundary and no covered behavior-preserving cleanup was warranted.
- `dist/watch/extension.d.ts` remained unchanged because the extension's exported declaration surface did not change; this is a non-material generated-output reconciliation difference.

No scope additions, deferred implementation items, dependency changes, protected-file changes, or checkpoint deviations occurred.

## Issues Encountered

None. Expected RED failures were resolved in GREEN, and all injected process/filesystem failure cases degraded as designed.

## Next Phase Readiness

**Ready:**
- A stable opt-in local-ASR seam with bounded config, typed diagnostics, validated timestamped segments, and exact distributable output.
- Deterministic fixture-free coverage for parser, process, config, sampler, ownership, privacy, and single/batch extension behavior.
- Phase 19 can add setup and diagnostic UX, deterministic English fixtures, optional bounded live proof, and installed end-to-end validation without changing the core ASR boundary.

**Concerns:**
- `mlx_whisper` and model data remain explicit user-managed prerequisites; Phase 19 must document setup and make missing-tool diagnostics useful without hidden installation.
- General accuracy, multilingual behavior, long-media support, and production memory characteristics remain outside the proven scope.
- The unchanged dependency tree still reports 0 critical / 4 high / 2 moderate advisories.

**Blockers:** None.

---
*Phase: 18-local-transcript-fallback, Plan: 01*
*Completed: 2026-08-10*
