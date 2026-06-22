---
phase: 09-batching
plan: 01
subsystem: watch
tags: [batching, watch-batch, runWatchBatch, pure-core, effect-boundary, tier-3-deferral, bounded-output, promise-allsettled]

requires:
  - phase: 05-watch-tool-primitive
    provides: the single-video `watch` tool effect boundary and WATCH_PARAMS surface that batching wraps
  - phase: 06-tier-adapters
    provides: implemented tier 1/2/3 runners and `walkTierChain` result shape
  - phase: 07-config-surface
    provides: `resolveWatchConfig` and config-driven runner composition at the extension boundary
  - phase: 08-watch-command
    provides: the pure-core + injected-effects wrapper pattern and tier-3 preservation decision
provides:
  - src/watch/batch.ts — pure `runWatchBatch` fan-out/aggregation core with bounded items/text and per-item error isolation
  - src/watch/extension.ts — registered `watch_batch` tool reusing the existing sample → route → walkTierChain pipeline
  - test/watch/batch.test.ts — deterministic batch specs covering fan-out, isolation, tier-3 deferral, truncation, and empty batch behavior
affects:
  - milestone-completion
  - future tier-3 subagent fan-out
  - future `/watch-batch` command surface

tech-stack:
  added: []
  patterns:
    - "Batch wrappers stay pure-core plus injected per-item processor; real sampling/routing remains at the extension boundary"
    - "Tier-3 batch is a lightweight sentinel/deferral, not many frame ImageContent payloads in one aggregate result"
    - "Batch outputs are bounded by item count and aggregate text budget"

key-files:
  created:
    - src/watch/batch.ts
    - test/watch/batch.test.ts
  modified:
    - src/watch/extension.ts
    - src/watch/index.ts

key-decisions:
  - "Decision: option-a — add a new `watch_batch` tool over pure `runWatchBatch`; do not extend the existing `watch` tool"
  - "Decision: tier-3 batch is deferred to single-video watch follow-up calls; no subagent fan-out in v0.1"
  - "Decision: batch output is bounded (8 items, 24k aggregate text chars) to protect local resources and context budget"

patterns-established:
  - "Pattern: batch effects are injected as `WatchItemProcessor`, enabling deterministic tests without ffmpeg/network"
  - "Pattern: batch tool uses batch-specific tier-3 sentinel runner to avoid constructing frame image content that will be dropped"
  - "Pattern: tool boundary errors throw so pi marks top-level execution failure; per-item failures are isolated inside the batch result"

duration: ~35min
started: 2026-06-21T20:15:00Z
completed: 2026-06-22T00:46:00Z
---

# Phase 9 Plan 01: Batching Summary

**The final v0.1 batching wrapper now ships as a new `watch_batch` tool backed by a pure `runWatchBatch` core: it fans out over multiple video/question items, aggregates tier-1/2 text answers into a bounded text result, isolates per-item failures, and defers tier-3 frame-heavy items to single-video watch follow-up calls instead of inlining many videos' frames.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~35 min |
| Started | 2026-06-21T20:15:00Z |
| Completed | 2026-06-22T00:46:00Z |
| Tasks | 3 (1 checkpoint decision + 2 auto tasks; 4 post-review hardening commits) |
| Files modified | 4 source/test files |
| Tests | 125/125 passing |
| Audit | 0 vulnerabilities |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Parallel fan-out with per-item error isolation | Pass | `runWatchBatch` uses `Promise.allSettled` over `Promise.resolve().then(() => processItem(item))`, so both sync throws and async rejections become per-item `status: "error"` results without aborting the batch. Results preserve index/ref/question order. |
| AC-2: Text-tier aggregation; tier-3 batch deferred | Pass | Tier 1/2 text parts are aggregated under per-item sections; tier-3 emits a single text deferral note to use the single-video watch tool. Aggregate output is text-only, capped at 24k chars, and never includes image parts. |
| AC-3: `watch_batch` tool wired at the boundary; clean gates; frozen core untouched | Pass | `watch_batch` is registered synchronously in `src/watch/extension.ts` with TypeBox params and promptSnippet, reusing resolved config/runners. Barrel exports added. Frozen sampler/router/config/contract/tier-runner/tier2/command surfaces were not modified. `npm run typecheck`, `npm run build`, `npm test`, and `npm audit` all pass. |

## Module Execution Reports

<!-- Finalized during UNIFY from post-apply + post-unify evidence. -->

## Accomplishments

- Created `src/watch/batch.ts`, a pure pi-free batching core with `BatchItem`, `WatchItemProcessor`, `BatchItemResult`, `BatchResult`, `WATCH_BATCH_MAX_ITEMS`, `WATCH_BATCH_MAX_TEXT_CHARS`, and `runWatchBatch`.
- Added deterministic batch tests in `test/watch/batch.test.ts` covering concurrent start/order preservation, async rejection isolation, synchronous throw isolation, tier-1/2 text aggregation, tier-3 deferral, mixed outcomes, output truncation, and empty batch behavior.
- Registered `watch_batch` in `src/watch/extension.ts` as an additive tool alongside `watch` and `/watch`, with shared budget/resolution overrides and a batch-specific tier-3 sentinel runner.
- Exported the batch surface from `src/watch/index.ts` for consumers/tests.
- Hardened the implementation after code review: capped batch size, capped aggregate text, avoided constructing tier-3 image content, corrected follow-up guidance, and threw on top-level tool failures.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: checkpoint decision | — | decision | Selected option-a: new `watch_batch` tool over pure `runWatchBatch`; tier-3 batch deferred. |
| Task 2: pure batch core + tests | `c9e6347` | feat | Added `runWatchBatch` core and initial six deterministic specs. |
| Task 3: register watch_batch + barrel export | `ba5b1a0` | feat | Added `WATCH_BATCH_PARAMS`, registered `watch_batch`, and exported batch surfaces. |
| Post-review hardening | `3e074fb` | fix | Capped batch fan-out to 8 items and used a tier-3 sentinel runner. |
| Post-review hardening | `2985953` | fix | Capped aggregate text output and isolated synchronous processor throws. |
| Post-review hardening | `cc2a407` | fix | Corrected tier-3 deferral follow-up wording to avoid unsupported quoted `/watch` syntax. |
| Post-review hardening | `929d2ab` | fix | Threw on top-level `watch_batch` failures and preserved truncation notes at exact cap. |

Plan metadata commit: pending (this UNIFY).

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/watch/batch.ts` | Created | Pure batch fan-out and aggregation core with item/text caps, per-item error isolation, tier-3 deferral, and exported types/constants. |
| `test/watch/batch.test.ts` | Created | 8 deterministic unit specs with stubbed processors; no ffmpeg/network/model calls. |
| `src/watch/extension.ts` | Modified | Registers `watch_batch` with TypeBox schema/promptSnippet and real per-item pipeline injection; uses tier-3 sentinel in batch mode. |
| `src/watch/index.ts` | Modified | Exports `runWatchBatch`, batch types/constants, and `WATCH_BATCH_PARAMS` / `WatchBatchInput`. |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Add a new `watch_batch` tool instead of extending `watch` | Keeps the proven single-video primitive stable and avoids a union parameter/result surface. | Batch is additive; existing `watch` and `/watch` behavior remains unchanged. |
| Defer tier-3 frame batch to single-video watch calls | DESIGN §5/§9 says tier-3 batch needs subagent fan-out and is deferred. Inline many-video frames could blow the context budget. | `watch_batch` remains text-only and bounded; future fan-out can be added deliberately. |
| Cap batch size at 8 items | Prevents unbounded ffmpeg/model fan-out from one tool call. | Large batch requests fail fast at the tool/core boundary and can be split by the user/agent. |
| Cap aggregate text at 24k chars | Tier 1 transcripts and tier 2 answers can be arbitrarily large; a real cap preserves the bounded-output guarantee. | Long text outputs include a truncation note and can be followed up individually. |
| Throw on top-level `watch_batch` failures | pi tool execution should be marked failed for schema/core unexpected errors; returned `isError` is not sufficient. | Batch-level failures surface as real tool failures; item-level failures remain isolated result entries. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 5 | Essential hardening from review; improves boundedness and failure semantics without changing approved scope. |
| Scope additions | 0 | No new product surface beyond approved `watch_batch`. |
| Deferred | 2 | Existing planned deferrals remain: tier-3 subagent fan-out and `/watch-batch` slash command. |

**Total impact:** Positive. The plan's intended behavior shipped, with additional boundedness/error-handling safeguards discovered during review. No new dependencies or architecture changes were introduced.

### Auto-fixed Issues

**1. [Resource Bound] Unbounded batch fan-out**
- **Found during:** Post-apply code review.
- **Issue:** Initial `watch_batch` accepted any number of items, allowing too many ffmpeg/model operations at once.
- **Fix:** Added `WATCH_BATCH_MAX_ITEMS = 8`, TypeBox `maxItems`, and a pure-core guard.
- **Files:** `src/watch/batch.ts`, `src/watch/extension.ts`, `src/watch/index.ts`
- **Verification:** typecheck/build/tests/audit; final code review no actionable findings.
- **Commit:** `3e074fb`

**2. [Tier-3 Deferral] Deferred tier-3 path still constructed image content**
- **Found during:** Post-apply code review.
- **Issue:** The first batch wiring called normal `tier3Runner` then dropped image parts during aggregation, wasting memory and undermining boundedness.
- **Fix:** Added a batch-specific tier-3 sentinel runner in `watch_batch` execution that returns lightweight text/details only.
- **Files:** `src/watch/extension.ts`
- **Verification:** typecheck/build/tests/audit; final code review no actionable findings.
- **Commit:** `3e074fb`

**3. [Bounded Output] Aggregate text could still grow too large**
- **Found during:** Follow-up review.
- **Issue:** Text-only did not guarantee bounded; long transcripts/tier-2 answers could blow context.
- **Fix:** Added `WATCH_BATCH_MAX_TEXT_CHARS = 24_000`, bounded append logic, truncation note, and truncation tests.
- **Files:** `src/watch/batch.ts`, `test/watch/batch.test.ts`, `src/watch/index.ts`
- **Verification:** typecheck/build/tests/audit; final code review no actionable findings.
- **Commit:** `2985953`, exact-cap note refined in `929d2ab`

**4. [Error Isolation] Synchronous processor throw aborted whole batch**
- **Found during:** Follow-up review.
- **Issue:** `items.map(processItem)` only isolated promise rejections; sync throws could abort mapping.
- **Fix:** Wrapped calls as `Promise.resolve().then(() => deps.processItem(item))` and added sync-throw tests.
- **Files:** `src/watch/batch.ts`, `test/watch/batch.test.ts`
- **Verification:** typecheck/build/tests/audit; final code review no actionable findings.
- **Commit:** `2985953`

**5. [Recovery Path] Tier-3 deferral note suggested unsupported quoted `/watch` syntax**
- **Found during:** Final review.
- **Issue:** `/watch` parser splits on first whitespace and does not strip quotes; suggested `/watch "ref" ...` could pass the wrong ref.
- **Fix:** Changed follow-up guidance to use the single-video watch tool with explicit `ref` and `question` fields; updated tests.
- **Files:** `src/watch/batch.ts`, `src/watch/extension.ts`, `test/watch/batch.test.ts`
- **Verification:** typecheck/build/tests/audit; final code review no actionable findings.
- **Commit:** `cc2a407`

### Deferred Items

- Tier-3 batch via subagent fan-out remains deferred (DESIGN §9).
- `/watch-batch` slash command remains deferred; the v0.1 primitive is the `watch_batch` tool.
- Existing project carries remain: dedicated CI workflow; file-based config / tier-order override; `/watch` budget/resolution flags + autocomplete; optional `typebox` peer-dependency cleanup.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Out-of-plan `.gitignore` edit made during preflight to ignore `.codegraph/` | Reverted immediately; `.codegraph/` remains an untracked local cache and was not staged/committed. |
| Initial code reviews found boundedness/error-path gaps | Fixed in four follow-up commits and reran full verification. |
| PALS packet contract doc missing from installed path during optional APPLY packet generation | Packet recorded the missing contract as `not available` and followed the loaded template/static rules. |

## Module Execution Reports

### Pre-Apply / Post-Task / Post-Apply Evidence

| Module | Result | Evidence |
|--------|--------|----------|
| TODD | PASS | Plan type `execute`; no RED-first requirement. Pure-core batch specs added and run. No regression after Task 2 or Task 3. |
| WALT | PASS / improved | Baseline `npm test` was 117/117; final `npm test` is 125/125. `npm run typecheck` and `npm run build` clean. |
| DEAN | PASS | `npm audit` reports 0 vulnerabilities; no dependencies added. |
| ARCH | PASS advisory | New pure core + existing effect boundary pattern preserved; no frozen-core signature changes. |
| SETH | PASS advisory | No secret-like literals found in planned source/test files. |
| IRIS | PASS advisory | No TODO/FIXME/HACK/XXX review markers found in changed source/test files. |
| DAVE | WARN carry | No `.github/workflows/ci.yml`; GitHub Flow merge gate remains Socket-only. |
| DOCS | PASS advisory | DESIGN already covers batching/tier-3 deferral; docstrings cite design constraints. |
| RUBY | PASS advisory | Pure-core/effect-boundary split remains thin; no preliminary debt indicators requiring action. |

### Pre-Unify

`[dispatch] pre-unify: 0 modules registered for this hook`

### Post-Unify

`[dispatch] post-unify: WALT, SKIP, CODI, RUBY executed (advisory; no blockers).`

| Module | Result | Side Effect / Evidence |
|--------|--------|------------------------|
| WALT | PASS / recorded | Appended `.paul/QUALITY-HISTORY.md` row: 117→125 tests passing, typecheck/build clean, npm audit 0 vulns, Socket checks passing. |
| CODI | PASS / recorded | Appended `.paul/CODI-HISTORY.md` row with explicit seeds `runWatchBatch`, `WatchItemProcessor`, `watchExtension`; no invented impact counts. |
| SKIP | PASS advisory | Knowledge candidates are already represented in SUMMARY frontmatter/decisions/patterns; no separate durable file created. |
| RUBY | PASS advisory | Measured debt posture: pure-core/effect-boundary split remains local and test-backed; no refactor blocker. |

## Validation

| Command / Check | Result |
|-----------------|--------|
| `npm run typecheck` | Pass |
| `npm run build` | Pass |
| `npm test` | Pass — 11 files, 125 tests |
| `npm audit` | Pass — 0 vulnerabilities |
| Final code review against `main` | Pass — no actionable findings |
| PR #11 Socket Security Project Report | Pass |
| PR #11 Socket Security Pull Request Alerts | Pass |

## Next Phase Readiness

**Ready:**
- The v0.1 build order is complete: sampler contract, sampler implementation, watch tool, tier adapters, config surface, `/watch` command, and batching all exist.
- `watch_batch` provides a safe, bounded text-oriented batch primitive for tiers 1/2.
- Tier-3 batch remains explicitly deferred with a clear recovery path (single-video watch follow-up) and future implementation seam (subagent fan-out).

**Concerns:**
- No dedicated CI workflow; merge gate is Socket-only.
- Live pi runtime/tool-call behavior and real ffmpeg/model sampling were not exercised during APPLY; coverage is unit/build/static-review based.
- `.codegraph/` remains an untracked local cache.

**Blockers:**
- None for UNIFY merge gate. PR #11 is open, clean, and Socket checks are passing.

---
*Phase: 09-batching, Plan: 01*
*Completed: 2026-06-22*
