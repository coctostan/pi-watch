---
phase: 14-youtube-source-resolution
plan: 01
subsystem: sampler
tags: [youtube, yt-dlp, source-resolution, temporary-files, tdd]

requires:
  - phase: 03-sampler-implementation
    provides: sampler effect boundary and stable sample() entry point
provides:
  - YouTube-first generic source classification and canonicalization
  - bounded argv-only yt-dlp download into sampler-owned temporary storage
  - original-ref preservation with deterministic cleanup across success and failure
  - offline resolver and sampling-lifecycle regression coverage
affects:
  - 15-caption-transcript-pipeline
  - 16-end-to-end-url-ux
  - sampler

tech-stack:
  added: []
  patterns:
    - generic source resolver with explicit caller vs sampler-temporary ownership
    - pure URL classification with effects isolated at the sampler boundary

key-files:
  created:
    - test/sampler/sample.test.ts
  modified:
    - src/sampler/effects.ts
    - src/sampler/sample.ts
    - src/sampler/index.ts
    - test/sampler/effects.test.ts

key-decisions:
  - "Preserve the caller's original ref for transcript lookup and WatchedFrameSet metadata; use resolved mediaRef only for ffprobe/ffmpeg."
  - "Treat only resolver-created directories as sampler-owned and removable; local refs remain borrowed."
  - "Run yt-dlp with --ignore-config so user/system configuration cannot widen the argv-controlled execution contract."

patterns-established:
  - "Resolved sources carry originalRef, mediaRef, ownership, and idempotent cleanup explicitly."
  - "If primary work and temporary cleanup both fail, preserve both causes in AggregateError."

duration: 27min
started: 2026-07-11T00:07:06Z
completed: 2026-07-11T00:33:36Z
---

# Phase 14 Plan 01: YouTube Source Resolution Summary

**The sampler now resolves supported YouTube URLs once through bounded, config-isolated `yt-dlp`, samples the owned local media, preserves the original caller ref, and cleans temporary storage across success and failure paths.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | 27 minutes |
| Started | 2026-07-11T00:07:06Z |
| Completed | 2026-07-11T00:33:36Z |
| Tasks | 3 completed (RED, GREEN, REFACTOR) |
| Files modified | 5 |

## Acceptance Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| AC-1: Local refs remain borrowed and unchanged | PASS | `resolveSource()` returns caller ownership without spawning or deleting; local golden clip and lifecycle tests preserve `source.ref`. |
| AC-2: Supported YouTube URLs resolve to owned local media | PASS | Offline tests cover watch, `youtu.be`, and shorts canonicalization plus one bounded argv-only `yt-dlp` call and owned output path. |
| AC-3: Temporary ownership is cleaned on all paths | PASS | Resolver and sampler tests cover success, setup/download/output failures, downstream failures, idempotence, and dual-failure preservation. |
| AC-4: Resolver failures are bounded and legible | PASS | Tests cover unsupported/malformed refs, missing binary, timeout, non-zero exit, absent/ambiguous/unsafe output, bounded stderr, and `--ignore-config`. |
| AC-5: Existing sampler and tier contracts stay stable | PASS | 171 tests pass, typecheck/build pass, `source.ref` and transcript input remain original, and no dependency/contract/watch/router/config files changed. |

## Module Execution Reports

### TODD — TDD Execution

| Phase | Commit | Result |
|-------|--------|--------|
| RED | `c081b98` | VALID RED: 16 expected failures / 9 passes; typecheck clean |
| GREEN | `0eed207` | 27 targeted tests passed; typecheck clean |
| REFACTOR | `ce649d7` | Full suite passed; URL error output bounded and caller query data removed |
| Review fixes | `3e62ba4`, `b3ff94e` | Dual-error preservation and `yt-dlp --ignore-config`; final suite green |

**Final:** 171 passed, 0 failed, 1 skipped. No unresolved regression.

### WALT — Quality

| Metric | Before | After | Delta | Trajectory |
|--------|--------|-------|-------|------------|
| Tests passing | 152 | 171 | +19 | ▲ improved |
| Tests failing | 0 | 0 | 0 | ● stable |
| Tests skipped | 1 | 1 | 0 | ● stable |
| Typecheck | pass | pass | stable | ● stable |
| Build | pass | pass | stable | ● stable |
| Lint/format | — | — | not configured | — skipped |

**Overall:** ▲ improved. `npm audit` remained at 0 vulnerabilities.

### Post-Apply Advisory Modules

- **ARCH:** Existing explicit-effects boundary preserved; process/filesystem work remains in `effects.ts`, orchestration in `sample.ts`.
- **SETH:** Exact supported hosts/IDs, canonical URLs, argv-only execution, bounded timeout/buffer, owned path validation, and `--ignore-config` verified. No secret/auth surface added.
- **OMAR / IRIS:** Initial concern that cleanup failures could hide primary failures was fixed in `3e62ba4` with `AggregateError` and regression tests.
- **PETE / REED:** Process time/output are bounded and cleanup paths are explicit. Download-size limiting is intentionally outside Phase 14 scope.
- **DOCS:** User-facing prerequisites/live URL documentation intentionally remains Phase 16 scope; no confirmed documentation drift.
- **GABE, DANA, LUKE, ARIA, DAVE, VERA:** Not applicable to changed files.
- **SKIP:** No complete additional knowledge entry emitted; this SUMMARY is the durable reconciliation source.

### Independent Review

The code-reviewer found no critical issues. Its cleanup-observability and user-config isolation findings were fixed in `3e62ba4` and `b3ff94e`. Raw-shape URL normalization and download-size caps remain non-blocking/out of the approved scope. Codex adversarial review could not authenticate (expired token), so no Codex findings were produced.

### Post-Unify Modules

- **WALT (p100):** Appended Phase 14 quality evidence to `.paul/QUALITY-HISTORY.md`: tests 152→171 (+19), 0 failures, one skipped live opt-in, typecheck/build pass, overall ▲ improved.
- **SKIP (p200):** No additional knowledge entry emitted. The current SUMMARY contains the complete source-backed decisions, context, and impact; no separate knowledge store existed, and no missing fields were invented.
- **CODI (p220):** Appended `14-01` to `.paul/CODI-HISTORY.md` as `no-dispatch-found`; the PLAN had advisory prose but no canonical success log or Blast Radius symbol headings from which R/U/K/Symbols could be parsed safely.
- **RUBY (p300):** No technical debt concerns in changed files. Measured source sizes: `effects.ts` 452 lines, `sample.ts` 120, `index.ts` 47; pure URL decisions remain separated from process/filesystem effects and all behavior is test-backed.

## Accomplishments

- Added strict YouTube watch/short-link/shorts classification and canonicalization behind a generic source seam.
- Added `yt-dlp` download into an owned temp directory with timeout, max-buffer, output confinement, idempotent cleanup, contextual errors, and user-config isolation.
- Updated `sample()` to use local `mediaRef` only for ffprobe/ffmpeg while retaining original refs for transcript lookup and contract metadata.
- Added 19 deterministic offline tests without introducing a dependency or requiring live YouTube/ffmpeg/yt-dlp for resolver coverage.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: RED contract | `c081b98` | test | URL, resolver ownership/error, and sample lifecycle expectations |
| Task 2: GREEN implementation | `0eed207` | feat | Generic resolver, owned download lifecycle, sample integration, exports |
| Task 3: REFACTOR | `ce649d7` | refactor | Bounded resolver errors without caller URL query leakage |
| Post-apply review fix | `3e62ba4` | fix | Preserve both primary and cleanup failures |
| Security review fix | `b3ff94e` | fix | Ignore user/system `yt-dlp` configuration |

Plan metadata completion commit is created by UNIFY after this summary is finalized.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/sampler/effects.ts` | Modified | Source classification, canonicalization, owned `yt-dlp` resolution, cleanup, and errors |
| `src/sampler/sample.ts` | Modified | Resolve once, route original vs media refs, and guarantee owned cleanup |
| `src/sampler/index.ts` | Modified | Export resolver functions and stable types |
| `test/sampler/effects.test.ts` | Modified | Offline resolver, security, error, path, and cleanup coverage |
| `test/sampler/sample.test.ts` | Created | Original/resolved ref routing and downstream cleanup lifecycle coverage |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Keep `originalRef` separate from `mediaRef` | Phase 15 needs the webpage URL for captions while ffprobe/ffmpeg need local media | Caption work can extend the seam without changing `WatchedFrameSet.source.ref` |
| Make ownership explicit | Prevent accidental deletion of caller paths and duplicate/ambiguous cleanup | Future resolvers must declare borrowed vs temporary ownership |
| Use one owned directory and exact printed output path | Gives deterministic cleanup and prevents URL-derived filesystem paths | Download artifacts remain confined and removable as one unit |
| Add `--ignore-config` | User/system `yt-dlp` config could otherwise add hooks or extra output | Runtime behavior stays controlled by the resolver's argv contract |
| Preserve dual failures with `AggregateError` | Cleanup errors must not erase probe/download/transcript failures | Callers retain both actionable causes when recovery also fails |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Essential production hardening inside planned files |
| Scope additions | 0 | No scope creep |
| Deferred | 1 | Download-size cap remains explicitly out of Phase 14 scope |

**Total impact:** The plan's behavior and boundaries were preserved; two review findings added tests and hardening within the approved resolver lifecycle.

### Auto-fixed Issues

**1. Cleanup failures could obscure primary failures**
- **Found during:** Post-apply OMAR/IRIS advisory review.
- **Issue:** Cleanup rejection could replace a downstream sampling error; resolver cleanup failure was suppressed.
- **Fix:** Aggregate the primary and cleanup errors while preserving both causes.
- **Files:** `src/sampler/effects.ts`, `src/sampler/sample.ts`, both sampler test files.
- **Verification:** Dual-failure tests plus targeted/full suite.
- **Commit:** `3e62ba4`.

**2. User/system `yt-dlp` config could widen execution behavior**
- **Found during:** Independent code review.
- **Issue:** External config could add print output, post-processing, or execution hooks outside the resolver's argv contract.
- **Fix:** Add and assert `--ignore-config`.
- **Files:** `src/sampler/effects.ts`, `test/sampler/effects.test.ts`.
- **Verification:** Targeted/full suite, typecheck, build, audit.
- **Commit:** `b3ff94e`.

### Deferred Items

- Download filesize/duration caps remain outside Phase 14's approved scope. The current process is time-bounded; Phase 16 can revisit operational limits alongside end-to-end URL UX if runtime evidence warrants it.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| First delegated RED helper was interrupted | Parent inspected partial changes; a second bounded `pals-implementer` completed valid RED without production edits |
| Codex adversarial review authentication expired | Recorded as unavailable; independent code-reviewer completed and its material finding was fixed |
| PR initially reported no checks | Socket checks appeared shortly afterward and passed |

## Next Phase Readiness

**Ready:**
- Phase 15 can call caption logic with the preserved original YouTube ref while visual sampling uses resolved local media.
- Local refs and tier-2/tier-3 contracts remain unchanged.
- Resolver errors and temporary ownership are explicit and offline-tested.

**Concerns:**
- Caption extraction must avoid re-downloading media unnecessarily and must preserve the current cleanup ownership boundary.
- Missing captions must continue to degrade to visual tiers without fabricating spoken content.
- Live YouTube proof, prerequisites, troubleshooting, and optional operational limits remain Phase 16 work.

**Blockers:** None.

---
*Phase: 14-youtube-source-resolution, Plan: 01*
*Completed: 2026-07-10*
