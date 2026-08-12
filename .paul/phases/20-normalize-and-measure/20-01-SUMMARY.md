---
phase: 20-normalize-and-measure
plan: 01
subsystem: sampler
status: complete
tags: [captions, webvtt, normalization, context-efficiency, tdd]
requires:
  - phase: 15-caption-transcript-pipeline
    provides: bounded captions-first WebVTT acquisition and shared-timeline transcript segments
provides:
  - conservative adjacent rolling-caption overlap normalization
  - deterministic corpus-scoped UTF-8 byte and duplicate-token baselines
  - focused pure caption parser/normalizer module with preserved effect-boundary export
  - reproducible compiled sampler output for Git/local Pi installation
affects:
  - 21-range-aware-evidence
  - 22-route-before-decoding
  - sampler caption acquisition
tech-stack:
  added: []
  patterns: [Pure Core Explicit Effects, adjacent bounded token overlap, corpus-scoped efficiency measurement]
key-files:
  created:
    - src/sampler/captions.ts
    - test/fixtures/captions/rolling-overlap.fixture.ts
    - test/sampler/captions.test.ts
    - dist/sampler/captions.js
    - dist/sampler/captions.d.ts
  modified:
    - src/sampler/effects.ts
    - dist/sampler/effects.js
    - dist/sampler/effects.d.ts
key-decisions:
  - "Normalize only temporally overlapping adjacent raw cues with exact case-sensitive token overlap of at least three tokens."
  - "Bound prior-cue token work at 4,096 tokens and preserve over-budget cues unchanged."
  - "Keep caption I/O and fallback behavior in effects.ts while moving deterministic parsing and normalization into captions.ts."
patterns-established:
  - "Measure transcript efficiency with exact corpus-scoped UTF-8 bytes and known duplicate-token emissions, not generalized savings claims."
  - "Compare rolling-caption chains against the immediately previous raw cue so normalization remains conservative and deterministic."
duration: 3min task-commit span
started: 2026-08-11T22:21:19-04:00
completed: 2026-08-11T22:24:02-04:00
---

# Phase 20 Plan 01: Conservative Rolling-Caption Normalization and Context Baseline Summary

**Shipped a bounded pure caption core that removes exact adjacent rolling-caption overlap while preserving timing, source, wording boundaries, legitimate repetition, and the existing caption-effect fallback contract.**

## Performance

| Metric | Value |
|--------|-------|
| Task commit span | 3 minutes |
| First task commit | 2026-08-11T22:21:19-04:00 |
| Final task commit | 2026-08-11T22:24:02-04:00 |
| Tasks | 3 completed |
| Planned output files changed | 12 |
| Production source files changed | 2 |
| Raw fixture transcript | 301 UTF-8 bytes |
| Normalized fixture transcript | 235 UTF-8 bytes |
| Known duplicate tokens | 12 → 0 |

## Acceptance Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| AC-1: RED proves rolling-caption waste and preservation rules | PASS | Commit `e6b2f35` added the synthetic fixture and focused assertions before production implementation. The focused run failed for the intentionally absent caption module/normalization behavior rather than fixture syntax or unrelated behavior. |
| AC-2: GREEN emits only non-overlapping caption evidence without semantic loss | PASS | Commit `f034821` extracted the parser and implemented one-pass adjacent normalization. Focused caption and effect tests passed with exact expected segments, unchanged timing/source, non-mutation, and preserved short/case/punctuation/separated repetition. |
| AC-3: REFACTOR records measured reduction and preserves the distributable baseline | PASS | Commit `9bd32e4` added the 4,096-token work bound, near-16 MiB evidence, exact 301→235 byte and 12→0 known-duplicate metrics, and reproducible `dist/sampler/**` output. APPLY passed 255 tests / 3 skipped, typecheck, build, clean second-build dist comparison, whitespace, audit comparison, module gates, and adversarial review. |

## Spec Deltas and Routing

No deltas

## Module Execution Reports

[dispatch] pre-unify: 0 modules registered for this hook.

### WALT

**Status: PASS.** Post-unify used APPLY-captured evidence without re-running checks: 248 passing / 3 skipped tests before APPLY and 255 passing / 3 skipped after APPLY, with typecheck and reproducible build passing and no lint runner configured. Quality improved by seven passing tests with no regression. A normalized `20-01` row was appended to `.paul/QUALITY-HISTORY.md`.

### SKIP

**Status: NOTE.** Source-backed knowledge retained: rolling-caption normalization removes only exact, case-sensitive overlap of at least three tokens between temporally overlapping adjacent raw cues; over-budget prior cues remain unchanged after the 4,096-token work ceiling. Source: this SUMMARY, `Decisions Made`; date: 2026-08-12; type: decision; phase/plan: 20/20-01; context: reduce repeated caption evidence without deleting legitimate speech or adding fuzzy/model work; impact: Phase 21 range selection and Phase 22 transcript-first routing consume smaller evidence while timing/source and conservative fallback remain stable.

### CODI

**Status: NOTE.** The PLAN contains bounded `parseWebVtt` downstream-impact prose but no canonical CODI success/skip log or Blast Radius symbol headings. Per the instrumentation taxonomy, the normalized outcome is `no-dispatch-found`; no R/U/K counts or symbols were invented. A normalized `20-01` row was appended to `.paul/CODI-HISTORY.md`.

### RUBY

**Status: PASS_WITH_CONCERNS.** Changed readable source measured 193 lines in `src/sampler/captions.ts` and 634 lines in `src/sampler/effects.ts`. The change applied the test-backed Extract Pure Core pattern and reduced the existing effects hotspot; `effects.ts` remains above 500 lines, but broader decomposition is pre-existing deferred work and outside this plan. No new changed-source technical-debt concern requires action.

[dispatch] post-unify: WALT PASS; SKIP NOTE; CODI no-dispatch-found; RUBY PASS_WITH_CONCERNS — existing reduced effects hotspot remains deferred. No module blocked UNIFY.

## Accomplishments

- Extracted WebVTT parsing from the sampler effect hotspot into a 193-line pure caption module while preserving the public `effects.ts` re-export and caption acquisition behavior.
- Added conservative normalization that examines only temporally overlapping adjacent raw cues, drops exact duplicates, and removes only the longest exact case-sensitive suffix/prefix overlap of at least three tokens.
- Preserved current cue timestamps/source, legitimate repeated speech, one/two-token overlap, punctuation/case differences, non-adjacent repetition, malformed/tag-only cue handling, Unicode, and caller input immutability.
- Bounded overlap work at 4,096 prior-cue tokens and proved near-caption-limit current cues avoid full token-array amplification.
- Reduced the synthetic corpus from 301 to 235 UTF-8 transcript bytes and known duplicate-token emissions from 12 to 0 without claiming a general production percentage.
- Regenerated and reproduced exact compiled `dist/sampler/captions.*` and `dist/sampler/effects.*` output for Git/local package installs.

## Task and Verification Results

| Task | Commit | Result | Verification |
|------|--------|--------|--------------|
| Task 1 — RED: Capture corpus, preservation cases, and baseline | `e6b2f35` | PASS | Test-only commit produced the expected missing-module/normalization RED while establishing inspectable raw and expected evidence. |
| Task 2 — GREEN: Extract pure caption core and normalize overlap | `f034821` | PASS | Focused caption/effect suite passed with exact normalized segments and preserved effect behavior. |
| Task 3 — REFACTOR: Bound complexity, regenerate dist, and prove safety | `9bd32e4` | PASS | Focused 48/48 and full 255 passed / 3 skipped; typecheck, build, clean second-build dist reproduction, `git diff --check`, unchanged audit baseline, module gates, and adversarial review passed. |

Dependency evidence remained 0 critical / 4 high / 2 moderate / 0 low, with no manifest, lockfile, dependency, script, peer, or package-surface change.

UNIFY re-ran `npm test`, `npm run typecheck`, and `npm run build`; all passed with 255 tests / 3 skipped, reproducible committed `dist/**`, and clean staged/unstaged whitespace checks.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/sampler/captions.ts` | Created | Pure WebVTT parsing plus conservative bounded adjacent-overlap normalization. |
| `src/sampler/effects.ts` | Modified | Imports and publicly re-exports the pure parser/normalizer while retaining caption I/O and fallback effects. |
| `test/fixtures/captions/rolling-overlap.fixture.ts` | Created | Synthetic raw WebVTT, raw/expected segments, overlap prefixes, and exact corpus metrics. |
| `test/sampler/captions.test.ts` | Created | Direct normalization, parser integration, preservation, non-mutation, work-bound, and metric evidence. |
| `dist/sampler/captions.js` and maps/types | Created | Exact compiled package output for the new pure caption module. |
| `dist/sampler/effects.js` and maps/types | Modified | Exact compiled output preserving the existing sampler export boundary. |

Every planned implementation/distribution file changed. The assessment, PLAN, SUMMARY, STATE, PROJECT, ROADMAP, module histories/ledger, and archived handoff are normal PALS lifecycle artifacts.

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Require temporal overlap and exact case-sensitive adjacent token matching | Automatic rolling captions repeat exact prior wording, while fuzzy or non-adjacent matching risks deleting legitimate speech. | Only exact adjacent evidence is removed; punctuation, case, separated repetition, and later repeats remain intact. |
| Require at least three overlapping tokens | One/two-token repetition is common legitimate speech and too ambiguous to remove safely. | Normalization is intentionally conservative rather than maximizing compression. |
| Compare against the immediately previous raw cue | Rolling chains must compare source evidence, not already-shortened output, while avoiding all-pairs work. | Traversal stays one-pass and deterministic with stable chain behavior. |
| Preserve over-budget prior cues unchanged after 4,096 tokens | Caption files are bounded, but token-array work also needs a conservative ceiling. | Pathological prior cues degrade to no normalization instead of amplifying work or risking semantic loss. |
| Keep metrics exact and corpus-scoped | The recovered 70–90% estimate was not measured for this project. | Phase 20 claims only 301→235 bytes and 12→0 known duplicate tokens for the committed synthetic corpus. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed workspace artifact | 1 | No product or specification impact |
| Scope additions | 0 | None |
| Deferred | 0 | None beyond already-routed roadmap work |

The PAUSE WIP commit `04c97ad` captured `.codegraph/graph.db` because the user explicitly selected commit-all. UNIFY confirmed that it is a pre-existing local tooling cache, absent from `main` and outside the PLAN, then removed it from the PR while leaving the local cache untracked. No `.gitignore` policy or product file was changed.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Pause artifacts were one local commit ahead of the pushed PR and the active handoff remained untracked | Consumed and archived the handoff during UNIFY; finalized lifecycle artifacts will be committed and pushed through the required GitHub Flow gate. |
| `.codegraph/graph.db` was accidentally included by commit-all | Removed it from tracked PR content during reconciliation; no product behavior or specification changed. |

## Next Phase Readiness

**Ready:**
- Phase 21 can apply timestamp and explicit start/end ranges to smaller, normalized transcript evidence.
- Timestamp/source fidelity and the public caption-effect export remain stable for range and coverage metadata work.
- Phase 22 can stage transcript acquisition before frame decoding without inheriting rolling-caption duplication.

**Concerns:**
- Normalization is intentionally exact and case-sensitive; Phase 21/22 must not broaden it into fuzzy matching, synthesis, persistent handles, or model work.
- `src/sampler/effects.ts` remains a measured 634-line hotspot despite shrinking from the pre-extraction baseline; unrelated decomposition remains deferred.
- The unchanged dependency tree reports 0 critical / 4 high / 2 moderate advisories.

**Blockers:** None.

---
*Phase: 20-normalize-and-measure, Plan: 01*
*Completed: 2026-08-12*
