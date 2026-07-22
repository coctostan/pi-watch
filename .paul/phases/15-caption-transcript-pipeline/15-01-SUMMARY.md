---
phase: 15-caption-transcript-pipeline
plan: 01
subsystem: sampler
tags: [youtube, captions, webvtt, yt-dlp, transcript, tdd]

requires:
  - phase: 14-youtube-source-resolution
    provides: originalRef/mediaRef separation and sampler-owned temporary cleanup
provides:
  - best-effort human-caption acquisition with one automatic-caption fallback
  - pure WebVTT parsing into timestamped TranscriptSegment values
  - caption-backed tier-1 reachability through the existing sampler timeline
  - bounded caption file reads and visual fallback when captions are unavailable
  - deterministic offline caption acquisition and timeline regression coverage
affects:
  - 16-end-to-end-url-ux
  - sampler
  - tier-1 routing

tech-stack:
  added: []
  patterns:
    - pure WebVTT parsing inside an explicit process/filesystem effect boundary
    - bounded subtitle-only yt-dlp acquisition with owned temporary cleanup

key-files:
  created: []
  modified:
    - src/sampler/assemble.ts
    - src/sampler/effects.ts
    - src/sampler/index.ts
    - test/sampler/assemble.test.ts
    - test/sampler/effects.test.ts
    - test/sampler/sample.test.ts

key-decisions:
  - "Prefer valid human captions and make at most one automatic-caption fallback attempt; every failure returns transcript source none."
  - "Drop transcript cues that start at or after media duration so merged caption timing always satisfies the existing timeline invariant."
  - "Reject caption files larger than 16 MiB before reading them into memory."

patterns-established:
  - "Caption subprocesses are subtitle-only, argv-only, timeout/buffer-bounded, and isolated from user yt-dlp configuration."
  - "Caption candidate discovery is owned-directory-confined, regular-VTT-only, and deterministically ordered."

duration: 31min
started: 2026-07-22T12:28:42-04:00
completed: 2026-07-22T12:59:43-04:00
---

# Phase 15 Plan 01: Caption Transcript Pipeline Summary

**Supported YouTube refs now produce timestamped human or automatic captions through a bounded best-effort pipeline, making the existing transcript-first tier reachable while preserving visual fallback for every unavailable or invalid caption path.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | 31 minutes |
| Started | 2026-07-22T12:28:42-04:00 |
| Completed | 2026-07-22T12:59:43-04:00 |
| Tasks | 3 completed (RED, GREEN, REFACTOR) plus 3 review-fix commits |
| Files modified | 6 source/test files |

## Acceptance Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| AC-1: WebVTT becomes a valid timestamped transcript | PASS | Direct parser tests cover headers, identifiers, both timestamp forms, cue settings, multiline text, markup/timestamp stripping, six standard cue character references, malformed/reversed/empty cues, and stable ordering. |
| AC-2: Human captions are preferred with automatic fallback | PASS | Offline injected-effect tests assert canonical YouTube refs, bounded argv-only subtitle requests with `--ignore-config`, `--no-playlist`, and `--skip-download`, human-first behavior, and exactly one automatic fallback only when needed. |
| AC-3: Caption effects are best-effort and cleanup-owned | PASS | Tests cover local bypass, missing binary, timeout/non-zero exit, absent/unsafe/oversized VTT output, read/setup/cleanup failures, `none` degradation, and exactly-once removal of created caption storage. |
| AC-4: Captions reach tier 1 and absence preserves visual fallback | PASS | Sampler tests carry caption segments from `originalRef` onto the validated shared timeline; existing router/tier tests remain green, while `none` leaves the tier-2/tier-3 chain unchanged. |
| AC-5: Existing contracts and offline behavior remain stable | PASS | Final APPLY verification recorded 189 passing, 0 failing, 1 default-skipped live test; strict typecheck and build passed; audit stayed at 0 critical / 1 high / 1 moderate; no dependency, contract, watch, router, tier, config, docs, `sample.ts`, or generated-source change. |

## Module Execution Reports

[dispatch] pre-unify: 0 modules registered for this hook.

### TODD — TDD Execution

| Phase | Commit | Result |
|-------|--------|--------|
| RED | `44ab797` | VALID RED: targeted caption/parser/timeline expectations failed on missing production behavior; exact failure count was not retained. |
| GREEN | `5bd06ca` | Caption parser/effect and sampler timeline expectations passed. |
| REFACTOR | `06b5556` | Deterministic ordering/comment cleanup preserved GREEN. |
| Review RED/fixes | `3760550`, `f2ca5f1`, `36dad7a` | Character-reference, duration-invariant, and pre-read size regressions added and resolved. |

**Final:** 189 passed, 0 failed, 1 default-skipped live test. No unresolved regression.

### WALT — Quality

| Metric | Before | After | Delta | Trajectory |
|--------|--------|-------|-------|------------|
| Tests passing | 171 | 189 | +18 | ▲ improved |
| Tests failing | 0 | 0 | 0 | ● stable |
| Tests skipped | 1 | 1 | 0 | ● stable |
| Typecheck | pass | pass | stable | ● stable |
| Build | pass | pass | stable | ● stable |
| Lint/format | — | — | not configured | — skipped |

**Overall:** ▲ improved. `npm audit --json` remained at 0 critical / 1 high / 1 moderate with no dependency changes.

### Post-Apply Advisory Modules

- **ARCH:** The pure parser and timeline merge remain separate from process/filesystem effects. The effect boundary grew to 656 lines, so a focused future split is advisory; no boundary violation blocks closure.
- **SETH:** Canonical supported URLs, argv-only `execFile`, `--ignore-config`, timeout/max-buffer limits, owned path confinement, and the 16 MiB pre-read cap are covered; no secrets/auth surface changed.
- **IRIS / OMAR:** Review concerns around encoded caption text, out-of-duration cues, and pre-read allocation were resolved in `3760550` and `36dad7a`; failures still degrade explicitly to `none`.
- **PETE / REED:** One human attempt plus one automatic fallback is bounded; no media re-download or unbounded retry was introduced; oversized VTT candidates are rejected before allocation.
- **DOCS:** Phase 16 still owns user-facing `yt-dlp` prerequisites, troubleshooting, and end-to-end URL proof; no confirmed documentation drift in Phase 15 scope.
- **DEAN:** Audit unchanged at 0 critical / 1 high / 1 moderate; no new dependency or manifest change.
- **GABE, DANA, LUKE, ARIA, DAVE, VERA:** Not applicable to the changed sampler/source-test files.

### Independent Review

Independent review findings were addressed before UNIFY: standard WebVTT character references are decoded, cues beginning outside media duration are dropped, and caption files are capped before reading. The final review fixes are covered by dedicated RED/GREEN commits and the full verification set.

### Post-Unify Modules

[dispatch] post-unify: WALT(p100), SKIP(p200), CODI(p220), RUBY(p300) completed; no blocking action returned.

- **WALT (p100):** Appended `15-01` to `.paul/QUALITY-HISTORY.md`: tests 171→189 (+18), 0 failures, one skipped live opt-in, typecheck/build pass, overall ▲ improved.
- **SKIP (p200):** No additional knowledge entry emitted. This SUMMARY contains the complete source-backed decisions, context, and impacts; no separate knowledge store exists, and no missing fields were invented.
- **CODI (p220):** Appended `15-01` to `.paul/CODI-HISTORY.md` as `no-dispatch-found`; PLAN advisory prose contained no canonical CODI success/skip log or Blast Radius symbol headings from which R/U/K/Symbols could be parsed safely.
- **RUBY (p300):** Advisory technical-debt concern: measured changed source sizes are `effects.ts` 656 lines, `assemble.ts` 141, and `index.ts` 51. The new caption decisions are already extracted into pure helpers (`parseWebVtt`, timestamp/timing/markup parsing, caption argv assembly), but the enlarged effect boundary is a focused, test-backed Extract Function/module candidate for a future scoped refactor; no current block.

## Accomplishments

- Replaced the transcript stub with a never-throwing caption effect for supported YouTube refs, preferring human captions and falling back once to automatic captions.
- Added a pure WebVTT parser with deterministic ordering, multiline/markup handling, malformed-cue rejection, and standard cue character-reference decoding.
- Confined subtitle discovery and reads to sampler-owned temporary storage, capped files at 16 MiB before allocation, and guaranteed one cleanup attempt.
- Added 18 passing offline tests over the Phase-14 baseline while preserving local-file and visual-tier behavior.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: RED contract | `44ab797` | test | WebVTT parsing, bounded human-to-auto acquisition, cleanup, and shared-timeline expectations; targeted command failed on missing production behavior as intended (exact RED count was not retained). |
| Task 2: GREEN implementation | `5bd06ca` | feat | Pure parser, bounded subtitle effect, fallback/degradation behavior, cleanup, and exports. |
| Task 3: REFACTOR | `06b5556` | refactor | Source comments and deterministic code-point caption candidate ordering. |
| Review fix: character references | `3760550` | fix | Decode the six WebVTT cue-text character references with regression coverage. |
| Review RED | `f2ca5f1` | test | Reproduce out-of-duration timeline and oversized caption-read boundary failures. |
| Review fix: timeline and size bounds | `36dad7a` | fix | Drop out-of-duration cues and enforce the 16 MiB pre-read cap. |

Plan metadata completion commit is created by UNIFY after this summary is finalized.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/sampler/effects.ts` | Modified | WebVTT parsing, caption dependency contract, bounded subtitle-only acquisition, candidate validation, file cap, degradation, and cleanup. |
| `src/sampler/index.ts` | Modified | Export the parser and stable caption effect types. |
| `src/sampler/assemble.ts` | Modified (approved deviation) | Drop cues beginning at/after duration before clamping to preserve transcript timeline invariants. |
| `test/sampler/effects.test.ts` | Modified | Deterministic parser/effect/security/failure/cleanup coverage. |
| `test/sampler/sample.test.ts` | Modified | Original-ref caption lookup and validated shared-timeline integration. |
| `test/sampler/assemble.test.ts` | Modified (approved deviation) | Regression coverage for out-of-duration transcript cues. |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Human captions first, one automatic fallback | Use the cheapest available spoken-content source without retries or provider-specific branches | Tier 1 becomes reachable while acquisition remains bounded and model-agnostic. |
| Every caption failure degrades to `none` | Captions are optional and must never fabricate or block visual understanding | Existing tier-2/tier-3 fallback remains total for caption absence and operational failures. |
| Drop cues starting at/after duration | Clamping such cues can produce `endMs < startMs`, violating the existing contract | Caption timing cannot invalidate `WatchedFrameSet`; the pure merge behavior is directly tested. |
| Cap each VTT candidate at 16 MiB before read | Timeout/max-buffer bounds do not constrain a caption file already present on disk | Memory use is bounded before UTF-8 allocation, and oversized candidates safely fall through. |
| Decode only the six standard cue character references | Preserve text fidelity without adding an HTML parser dependency or inventing text | Parsing remains explicit, dependency-free, and covered by direct tests. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Essential parser/boundary hardening found during independent review. |
| Approved scope additions | 2 files | `assemble.ts` and its test changed to enforce the existing timeline contract. |
| Deferred | 1 | Focused decomposition of the enlarged sampler effect file remains future technical debt. |

**Total impact:** The approved deviation strengthened existing transcript invariants without changing public contracts, routing, orchestration, dependencies, or generated output.

### Auto-fixed Issues

**1. WebVTT character references were left encoded**
- **Found during:** Independent review after GREEN/REFACTOR.
- **Issue:** Caption text could expose `&amp;`, `&lt;`, `&gt;`, `&lrm;`, `&rlm;`, or `&nbsp;` instead of the cue text defined by WebVTT.
- **Fix:** Decode exactly the six standard cue character references.
- **Files:** `src/sampler/effects.ts`, `test/sampler/effects.test.ts`.
- **Verification:** Direct text-fidelity regression cases and final suite.
- **Commit:** `3760550`.

**2. Valid parser output could violate downstream duration/memory bounds**
- **Found during:** Independent review recovery.
- **Issue:** A cue beginning beyond media duration could become an invalid merged range, and VTT content was allocated before an explicit file-size check.
- **Fix:** Drop out-of-duration cues in the pure merge and reject candidates over 16 MiB before reading.
- **Files:** `src/sampler/assemble.ts`, `src/sampler/effects.ts`, `test/sampler/assemble.test.ts`, `test/sampler/effects.test.ts`.
- **Verification:** Review RED commit followed by targeted/full suite, typecheck, build, and unchanged audit.
- **Commits:** `f2ca5f1`, `36dad7a`.

### Approved Scope Addition

The user approved adding `src/sampler/assemble.ts` and `test/sampler/assemble.test.ts` after review demonstrated that caption cues starting outside media duration could violate `endMs >= startMs`. No architecture, dependency, contract, router, watch, config, docs, `sample.ts`, or generated-source change was introduced.

### Deferred Items

- `src/sampler/effects.ts` now exceeds 600 lines. Keep a focused, test-backed split as a future refactor rather than widening Phase 15 after behavior is green.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Initial implementation did not decode WebVTT cue character references | Added the six standard mappings and direct regression tests in `3760550`. |
| Review exposed timeline and pre-read size boundaries outside the original four-file list | User approved the minimal pure-core/test scope addition; RED coverage preceded `36dad7a`. |

## Next Phase Readiness

**Ready:**
- Phase 16 can exercise pasted YouTube URLs end to end through the real `watch` tool and `/watch` command with caption-backed tier 1 available.
- Caption absence, malformed files, process failures, and oversized candidates remain deterministic visual fallbacks.
- The implementation and tests remain offline by default and require no cloud key or new npm dependency.

**Concerns:**
- `yt-dlp` remains an external runtime prerequisite and should be documented and live-smoke-tested in Phase 16.
- `src/sampler/effects.ts` is a future focused split candidate; avoid unrelated refactoring during Phase 16 unless scope is approved.

**Blockers:** None.

---
*Phase: 15-caption-transcript-pipeline, Plan: 01*
*Completed: 2026-07-22*
