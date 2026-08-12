---
phase: 21-range-aware-evidence
plan: 01
subsystem: sampler-watch
status: complete
serves: [R2, R3, R5, R6]
tags: [ranges, youtube, captions, asr, sampling, coverage, truncation, tdd]
requires:
  - phase: 20-normalize-and-measure
    provides: normalized caption cues before range selection
provides:
  - deterministic YouTube and explicit whole-second range resolution
  - range-filtered caption, eligible ASR, and sampled-frame evidence on one absolute timeline
  - fixed-size available and post-bound returned evidence metadata
  - reproducible compiled package output for range-aware tools
tech-stack:
  added: []
  patterns: [Pure Core Explicit Effects, half-open absolute ranges, post-bound evidence accounting]
key-files:
  created:
    - src/sampler/range.ts
    - test/sampler/range.test.ts
    - dist/sampler/range.js
    - dist/sampler/range.d.ts
  modified:
    - src/contract/watched-frame-set.ts
    - src/sampler/effects.ts
    - src/sampler/sample.ts
    - src/sampler/assemble.ts
    - src/watch/extension.ts
    - src/watch/tier-runner.ts
    - src/watch/batch.ts
    - README.md
    - docs/YOUTUBE-SETUP.md
duration: 41min task-commit span
started: 2026-08-12T10:26:03-04:00
completed: 2026-08-12T11:07:10-04:00
pr: https://github.com/coctostan/pi-watch/pull/32
---

# Phase 21 Plan 01: Range-aware Transcript and Visual Evidence Summary

**Implemented one deterministic absolute half-open source range across supported YouTube timestamps, explicit tool bounds, normalized captions, eligible local ASR, budgeted visual frames, and fixed-size post-bound coverage metadata.**

## Acceptance Criteria Results

| Criterion | Status | Evidence |
|---|---|---|
| AC-1: RED fixes range semantics and fails for missing behavior | PASS | Commit `2d60e73` added eight test-file changes before production edits. The corrected focused RED run produced 122 passes and 17 expected failures naming absent `range.ts`, source metadata, schema fields, clipping/rebasing, and returned-evidence behavior. Typecheck failures were limited to intentionally missing range exports/types. |
| AC-2: GREEN returns only range-intersecting transcript and visual evidence | PASS | Commit `7cdb778` added the pure range core and narrow contract/sampler/watch integration. The focused eight-file suite passed 167/167, followed by full-suite and typecheck success. |
| AC-3: REFACTOR exposes bounded truthful metadata and preserves distributable behavior | PASS | Commit `0695c75` documented public semantics, hardened single/batch post-bound accounting through repeated adversarial review, and committed exact generated output including force-added `dist/sampler/range.*`. Final verification passed 309 tests / 3 skipped, typecheck, build, clean second-build dist comparison, whitespace, unchanged audit, module gates, and PR checks. |

## Exact Range Semantics

- Supported URL `t` or `start` values accept unsigned integer seconds, integer seconds with `s`, or ordered compact `h`/`m`/`s` forms such as `1h2m3s`.
- Each key is usable only as one syntactically valid, conversion-safe singleton. A present but unusable `start` prevents fallback to `t`; one valid `start` otherwise takes precedence over one valid `t`.
- Duplicate, malformed, negative, fractional, maximum-plus-one, and compact-overflow URL timestamps are optional query noise and do not reject a supported video ref.
- Explicit non-negative conversion-safe whole-second `start` overrides URL start metadata. Explicit `end` is exclusive and applies with explicit start, URL start, or zero.
- Missing bounds select `[0, durationMs)`. End beyond duration clamps to duration. Reversed/empty explicit bounds and effective start at/after duration fail before scene/frame work.
- Transcript cues intersect the absolute `[startMs, endMs)` range, clip only at boundaries, preserve source/text/stable order, and report transcript source `none` when no cue survives.
- Scene cuts are translated to range-relative offsets for the unchanged budget selector, then selected offsets are rebased to absolute source time before decode. `fpsSampled` uses effective range duration.

## Coverage and Truncation Evidence

`source.available` and public details use only fixed-size numeric summaries:

```json
{
  "range": { "startMs": 4000, "endMs": 8000 },
  "availableEvidence": {
    "frames": { "count": 2, "firstMs": 4000, "lastMs": 7000 },
    "transcript": { "count": 2, "firstMs": 4000, "lastMs": 8000 }
  },
  "returnedEvidence": {
    "frames": { "count": 2, "firstMs": 4000, "lastMs": 7000 },
    "transcript": { "count": 1, "firstMs": 4000, "lastMs": 4500 }
  },
  "truncation": { "transcript": true, "final": true }
}
```

Returned coverage is derived from evidence markers that remain in complete returned transcript segments and frame-label/image pairs after internal transcript limits, aggregate batch character/UTF-8 byte/line limits, final Pi limits, and trailing-guidance reservation. Tests cover partial items, omitted frame pairs, duplicate lines, overlapping cues, complete/partial multiline cues, multibyte text, near-limit multipart output, visual-only batches, and at most eight private indexed summaries. Details contain no refs, questions, transcript text, stderr, credentials, environment values, or model/cache paths.

## Task and Verification Results

| Task | Commit | Result | Verification |
|---|---|---|---|
| Task 1 — RED | `2d60e73` | PASS | Valid behavior-gap failures before production edits; fixtures corrected before GREEN to propagate mocked URL metadata and avoid an overbroad privacy regex. |
| Task 2 — GREEN | `7cdb778` | PASS | Focused 167/167, full regression and typecheck passed; one absolute range applied to captions, eligible ASR, and frames. |
| Task 3 — REFACTOR | `0695c75` | PASS | Final 309 passed / 3 skipped; typecheck/build clean; generated dist reproducible; audit unchanged; adversarial review ended with no material P1/P2 source findings. |

Dependency evidence remained 0 critical / 4 high / 2 moderate / 0 low. `package.json`, `package-lock.json`, dependencies, scripts, peer dependencies, and ASR/config policy did not change.

UNIFY re-verification (2026-08-12) independently reproduced the APPLY claims: `npm test` 309 passed / 3 skipped, `npm run typecheck` clean, `npm run build` followed by `git diff --exit-code -- dist` clean (committed `dist/**` reproducible), `git diff --check` clean, and `npm audit` unchanged at 0 critical / 4 high / 2 moderate / 0 low. Changed-file evidence matched the approved PLAN `files_modified` set exactly (55 files); no unplanned file changed and no plan boundary was crossed.

## Spec Deltas and Routing

One pre-filled candidate set was reviewed and approved in a single blocking human review during UNIFY.

| # | Type | Target | Delta | Proposed route | Human decision | Result |
|---|---|---|---|---|---|---|
| 1 | MODIFIED | R5 | `watch` also accepts optional whole-second `start` / `end` bounds and shared batch overrides beyond "video ref plus a question" | `prd-amend` | approved as proposed | R5 amended in place in `.paul/PRD.md` with Phase 21 / plan 21-01 and SUMMARY-path provenance |
| 2 | MODIFIED | R6 | Tier results carry fixed-size available-versus-returned coverage and truncation metadata | `discard` | approved as proposed | Decision recorded only; no intent edit, because the refinement stays inside R6 tier-delivery intent and is documented here |
| 3 | DEFERRED | M5 — Deferred product and maintenance work | Measured hotspots `src/watch/tier-runner.ts` (642 lines) and `src/watch/extension.ts` (493) now exceed the 500-line advisory, while the deferred entry named only `src/sampler/effects.ts` | `roadmap-amend` | approved as proposed | Deferred-debt entry amended in place in `.paul/ROADMAP.md` with Phase 21 / plan 21-01 and SUMMARY-path provenance |

Rationale for each route was recorded at review time: keep R5's public tool surface truthful, avoid manufacturing intent churn for an in-scope result-detail refinement, and keep the deferred-debt record measured and accurate.

## Module Execution Reports

- `[dispatch] pre-apply`: WALT baseline PASS at 255 passed / 3 skipped; TODD PASS because the approved TDD plan started with explicit RED work.
- `[dispatch] post-task(Task 1)`: TODD PASS — valid RED commit and behavior-gap failures only.
- `[dispatch] post-task(Task 2)`: TODD PASS — focused GREEN and no full-suite/type regression.
- `[dispatch] post-task(Task 3)`: TODD PASS — final suite, typecheck, reproducible build, docs, dist, audit, and adversarial gates passed.
- `[dispatch] post-apply advisory`: ARCH PASS_WITH_CONCERNS — imports preserve the established contract/sampler/watch direction and `range.ts` is a pure core; existing hotspots remain `effects.ts` (642 lines), `extension.ts` (493), `tier-runner.ts` (642), and `batch.ts` (350), with unrelated decomposition deferred. DOCS UPDATED for README and YouTube setup. IRIS PASS after adversarial findings were fixed; no material P1/P2 source issue remained. PETE PASS_WITH_CONCERNS — bounded string/marker scans and at most eight batch summaries; no new unbounded model/decode work. OMAR, REED, and VERA PASS; GABE/LUKE/ARIA/DANA/DAVE skipped for no applicable route/UI/data/CI file.
- `[dispatch] post-apply enforcement`: SETH PASS — safe-integer/millisecond validation and argv-only effect boundaries preserved, with private fixed-size details. DEAN PASS — 0/4/2/0 unchanged and no dependency files changed. TODD PASS — RED/GREEN/REFACTOR commit chain and no regression. WALT PASS — 255→309 passing tests, 3 skipped unchanged, typecheck clean, no lint runner configured.
- SKIP knowledge candidate: Phase 21 uses one absolute half-open range, keeps URL timestamps start-only and explicit bounds authoritative, and computes returned coverage only after final output bounds. Source: this summary and plan; impact: Phase 22 must preserve these semantics while changing orchestration order.

### UNIFY dispatch

`[dispatch] pre-unify: 0 modules registered for this hook.`
`[dispatch] post-unify: 4 modules dispatched — WALT (100), SKIP (200), CODI (220), RUBY (300).`

#### WALT

**Status: PASS.** Computed from APPLY-captured reports without re-running checks in the module: 255 passed / 3 skipped before APPLY and 309 passed / 3 skipped after, with typecheck and reproducible build passing and no lint runner configured. Delta is ▲ improved (+54 tests) with no regression. A normalized `21-01` row was appended to `.paul/QUALITY-HISTORY.md`.

#### SKIP

**Status: NOTE.** One complete source-backed entry from this SUMMARY: Phase 21 applies one absolute half-open range to captions, eligible ASR, and frames; supported URL timestamps contribute start only and explicit whole-second bounds are authoritative; returned coverage is computed only after final output bounds. Impact: Phase 22 must preserve these semantics while changing orchestration order.

#### CODI

**Outcome: `injected`.** Parsed only from the PLAN `<module_dispatch>` canonical success log: 5 resolved, 0 unresolved, 19 total call-sites across `normalizeYouTubeUrl`, `selectFrameTimes`, `mergeTranscript`, `sample`, and `transcriptToToolResultContent`. Row appended to `.paul/CODI-HISTORY.md` with `blast_radius=y`.

#### RUBY

**Status: PASS_WITH_CONCERNS.** Measured line counts on changed readable source files: `src/sampler/range.ts` 181 (pure core, no debt pattern), `src/sampler/sample.ts` 187, `src/sampler/assemble.ts` 158, `src/sampler/index.ts` 86, `src/contract/watched-frame-set.ts` 301, `src/watch/batch.ts` 350, `src/watch/extension.ts` 493, `src/sampler/effects.ts` 642, `src/watch/tier-runner.ts` 642. No lint or complexity runner is configured, so only measured size and explicit patterns are reported. Concern: `effects.ts` and `tier-runner.ts` exceed the 500-line advisory and remain Extract Pure Core candidates. Actioned through approved delta 3 (roadmap-amend); no in-phase refactor was performed.

## Deviations and Issues Encountered

| Type | Count | Resolution |
|---|---:|---|
| RED fixture correction | 2 | Amended only the test commit: mocked `ResolvedSource` now carries URL start metadata, and the privacy assertion checks actual synthetic question text rather than the word `question` inside a routing rationale. |
| Adversarial correctness fixes | 9 | Fixed notice reservation, partial-item coverage, visual-only evidence, duplicate/multiline occurrence accounting, batch effective ranges, overlapping-cue maxima, semantic coverage comparison, and tier-3 truncation flags; added regressions for each. |
| Dependency/architecture deviation | 0 | No dependency, ASR policy, config, route order, persistent state, or unrelated architecture change. |

The first Task 3 staging attempt was rejected because `dist/` is ignored. The parent workflow then force-added all intended generated files, including the four new `dist/sampler/range.*` artifacts, and verified them with `git ls-files` plus a clean second build.

## Phase 22 Handoff Constraints

- Phase 22 may reorder transcript acquisition before expensive visual work, but must preserve this phase's URL grammar, explicit precedence, safe conversion bounds, absolute half-open range, cue clipping, range-relative selection/absolute decode offsets, and available-versus-returned metadata.
- Phase 21 intentionally still runs the existing scene/decode orchestration before routing; it makes no avoided-decode claim.
- Keep caption normalization unchanged and before range selection. Preserve current captions-first ASR eligibility/resource policy and apply the same range to any eligible ASR result.
- Preserve argv-only `--ignore-config` effects, ownership/cleanup, tier order, `null === escalate`, tier-3 totality, 50 KB / 2,000-line bounds, 24,000-character batch cap, trailing guidance, and frame-pair atomicity.
- Do not add persistent transcript handles/cache, model-backed synthesis, fuzzy matching, cloud requirements, per-item batch ranges, string-valued tool times, ASR media slicing, or general URL/command parsing.

## GitHub Flow Postflight

- Branch: `feature/21-range-aware-evidence`
- PR: https://github.com/coctostan/pi-watch/pull/32
- PR state: OPEN
- Checks: Socket Security Project Report PASS; Socket Security Pull Request Alerts PASS
- Merge readiness is owned by UNIFY.
