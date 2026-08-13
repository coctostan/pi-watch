---
phase: 22-route-before-decoding
plan: 01
subsystem: router-sampler-watch
status: complete
serves: [R3, R4, R5, R6]
tags: [transcript-first, routing, sampling, captions, asr, frames, tdd]
requires:
  - phase: 21-range-aware-evidence
    provides: one absolute range and post-bound available-versus-returned evidence semantics
provides:
  - deterministic broad, spoken, mixed, visual, and on-screen-text routing policy
  - transcript-stage decision before scene detection and frame decoding
  - contract-valid transcript-only watched frame sets with zero frame work
  - reproducible compiled package output for transcript-first routing
affects:
  - 23-harden-and-prove
  - router
  - sampler
  - watch
tech-stack:
  added: []
  patterns: [Pure Core Explicit Effects, staged evidence acquisition, deterministic route reuse]
key-files:
  created: []
  modified:
    - src/router/route.ts
    - src/sampler/assemble.ts
    - src/sampler/sample.ts
    - src/watch/extension.ts
    - src/contract/watched-frame-set.ts
key-decisions:
  - "Broad and mixed prompts may start at tier 1 when an in-range transcript exists; explicitly visual/temporal and on-screen-text prompts remain visual."
  - "Broad-only prompts do not enable local ASR; spoken and mixed prompts retain captions-first ASR eligibility."
  - "The transcript stage owns range-filtered transcript evidence; sampled frames attach only when the staged route requires visual evidence."
patterns-established:
  - "Compute one deterministic routing decision from question plus staged transcript availability and reuse it for the tier walk."
  - "A transcript-only WatchedFrameSet has no frames, fpsSampled 0, and zero frame coverage."
duration: 3h03m task-commit span
started: 2026-08-12T19:27:10Z
completed: 2026-08-13T11:29:35Z
pr: https://github.com/coctostan/pi-watch/pull/33
merge_commit: 20ebc9e6ec1e8516fe5c9a024e200ef8ce4dc800
---

# Phase 22 Plan 01: Transcript-First Route Before Decoding Summary

**Shipped deterministic transcript-first staging so caption-backed broad, spoken, and mixed calls can finish at tier 1 with zero scene-detection and frame-decoding work while visual routes, misses, cleanup, ranges, coverage, and tier-3 totality remain intact.**

## Acceptance Criteria Results

| Criterion | Status | Evidence |
|---|---|---|
| AC-1: RED specifies transcript-first routing and fails for missing staged behavior | PASS | Test-first commit `f420b4b` added router, assembly, sampler, and extension expectations before production edits. APPLY recorded named Phase 22 behavior-gap failures rather than fixture, network, ffmpeg, or model failures. |
| AC-2: GREEN routes on transcript availability before visual work | PASS | Commit `66be81a` implemented broad/mixed policy, shared ASR eligibility, transcript-stage assembly, optional visual-stage predicate, and single/batch decision reuse. Focused tests prove transcript-backed tier-1 routes call scene detection and decode zero times. |
| AC-3: REFACTOR preserves visual totality, ownership, range metadata, and distributable behavior | PASS | Commits `7b9bf7f`, `a9871e4`, and `a8b73f2` aligned docs/dist and hardened OCR resolution, explicit temporal routing, and zero-FPS invariants. Final APPLY and UNIFY verification passed 337 tests / 3 skipped, typecheck, build, clean committed `dist/**`, whitespace checks, and unchanged audit evidence. |

## Exact Question Policy

| Question class | Transcript present | Route | Resolution | Local ASR eligibility |
|---|---:|---|---|---:|
| Spoken | yes | `[1, 2, 3]` | low | yes, when explicitly configured and captions miss |
| Spoken | no | `[2, 3]` | low | yes, when explicitly configured and captions miss |
| Broad / no marker | yes | `[1, 2, 3]` | low | no |
| Broad / no marker | no | `[2, 3]` | low | no |
| Mixed spoken + visual/temporal | yes | `[1, 2, 3]` | low | yes, when explicitly configured and captions miss |
| Mixed spoken + visual/temporal | no | `[2, 3]` | low | yes, when explicitly configured and captions miss |
| Explicit visual/temporal | either | `[2, 3]` | low | no |
| On-screen text | either | `[2, 3]` | high unless an explicit/configured high policy already applies | no |

On-screen-text markers take precedence. Explicit temporal words and timestamps remain visual unless paired with spoken markers, which classify as mixed. Every route remains non-empty and ends at tier 3; no confidence score, model classifier, fuzzy inference, user mode, or mutable routing state was added.

## Effect Order and Behavioral Evidence

The sampler now executes one bounded sequence:

1. Resolve the source and retain ownership inside the existing `try/finally`.
2. Probe duration and resolve the Phase 21 absolute half-open range.
3. Fetch captions and assemble the range-filtered transcript stage.
4. On an eligible in-range caption miss, try bounded local ASR and rebuild the transcript stage.
5. Invoke the deterministic staged route predicate with only `hasTranscript`.
6. Return the transcript-only stage when tier 1 is selected; otherwise detect scene cuts, select and decode budgeted frames, and attach them without reacquiring transcript evidence.

Focused verification passed 95/95 tests across `test/router/route.test.ts`, `test/sampler/assemble.test.ts`, `test/sampler/sample.test.ts`, and `test/watch/extension.test.ts`. Tagged Phase 22 tests cover single and batch short-circuiting, exact effect order, route-decision reuse, visual/OCR fallback, ASR eligibility/failure, range-relative selection with absolute decode offsets, contract validation, diagnostics, and cleanup.

Transcript-only sets are valid with `frames: []`, `frameCount: 0`, `fpsSampled: 0`, zero available frame coverage, and unchanged in-range transcript/source coverage. Frame attachment requires finite positive FPS when frames exist and exactly zero FPS when they do not. Default `sample()` callers without the staged predicate retain visual sampling behavior.

## Task and Verification Results

| Task | Commit | Result | Verification |
|---|---|---|---|
| Task 1 — RED | `f420b4b` | PASS | Tests preceded production edits and failed only for missing policy/stage behavior. |
| Task 2 — GREEN | `66be81a` | PASS | Transcript evidence is acquired before visual work; single/batch tier-1 success avoids scene/decode. |
| Task 3 — REFACTOR | `7b9bf7f` | PASS | DESIGN, README, YouTube setup, and exact compiled output match runtime behavior. |
| Hardening — OCR resolution | `a9871e4` | PASS | Question-derived high resolution is applied before single/batch decode while explicit and configured overrides remain authoritative. |
| Hardening — temporal and FPS invariants | `a8b73f2` | PASS | Explicit when/time/duration prompts stay visual; spoken-temporal prompts stay mixed; frame-bearing sets reject zero FPS. |

Final APPLY evidence: 337 passed / 3 skipped; typecheck passed; build and clean second-build `dist/**` comparison passed; `git diff --check` passed; final Codex review found no actionable issue. UNIFY independently reproduced 337 passed / 3 skipped, focused 95/95, typecheck, build, clean `dist/**`, and whitespace success.

Dependency evidence remains 0 critical / 4 high / 2 moderate / 0 low. No manifest, lockfile, dependency, peer range, script, config, environment, external-process, ASR ceiling, tier-runner, or batch-shape change was introduced.

## Files Reconciled

The approved PLAN named 37 changed paths. PR #33 changed those 37 paths plus five necessary contract counterparts:

- `src/contract/watched-frame-set.ts`
- `dist/contract/watched-frame-set.js`
- `dist/contract/watched-frame-set.js.map`
- `dist/contract/watched-frame-set.d.ts`
- `dist/contract/watched-frame-set.d.ts.map`

The added contract edits allow zero sampled FPS only for zero-frame transcript stages and preserve positive FPS for frame-bearing sets. No other unplanned product or package file changed.

## Spec Deltas and Routing

All three pre-filled candidates were approved as proposed in one blocking human review on 2026-08-13.

| # | Type | Target | Delta | Proposed route | Human decision | Result |
|---|---|---|---|---|---|---|
| 1 | MODIFIED | R4 | Router policy now lets broad and mixed prompts with non-empty in-range transcript evidence start at tier 1, keeps explicitly visual/temporal and on-screen-text prompts visual, and keeps broad-only prompts ASR-ineligible | `prd-amend` | approved as proposed | R4 amended in place in `.paul/PRD.md` with Phase 22 / plan 22-01 and SUMMARY-path provenance |
| 2 | MODIFIED | R2 | A transcript-only `WatchedFrameSet` reports zero frames and `fpsSampled: 0`, while frame-bearing sets require positive sampled FPS | `discard` | approved as proposed | Decision recorded only; no intent edit because this is an internal invariant refinement within the tier-neutral sampler contract |
| 3 | REMOVED | R3 carried-forward follow-up | Question-derived OCR resolution is now applied before frame decoding in single and batch watch paths | `roadmap-amend` | approved as proposed | The completed follow-up was removed from `.paul/ROADMAP.md` and `.paul/PROJECT.md` in place; R3 itself remains unchanged; provenance is Phase 22 / plan 22-01 and this SUMMARY path |

## Module Execution Reports

- `[dispatch] pre-unify: 0 modules registered for this hook.`
- `[dispatch] post-unify: 4 modules dispatched — WALT (100), SKIP (200), CODI (220), RUBY (300).`

### WALT

**Status: PASS.** Computed from APPLY-captured reports without re-running checks in the module: 309 passed / 3 skipped before APPLY and 337 passed / 3 skipped after; typecheck and reproducible build passed; no lint runner is configured. Delta is ▲ improved (+28 tests) with no regression. A normalized `22-01` row was appended to `.paul/QUALITY-HISTORY.md` during UNIFY.

### SKIP

**Status: NOTE.** One complete source-backed knowledge entry is available from this SUMMARY: route once after transcript staging, pass only transcript availability into the decision, and reuse the resulting decision so successful caption-backed broad/spoken/mixed calls avoid visual work without changing visual fallback. Impact: Phase 23 compiled-package proof should assert this exact effect boundary and preserve broad-only ASR ineligibility.

### CODI

**Outcome: `injected`.** The PLAN's canonical CODI log records 5 resolved symbols, 0 unresolved symbols, and 14 total call-sites across `sample`, `classifyQuestion`, `route`, `routeContextFromSet`, and `watchExtension`. A `22-01` row was appended to `.paul/CODI-HISTORY.md` with `blast_radius=y` during UNIFY.

### RUBY

**Status: PASS_WITH_CONCERNS.** Measured changed readable source sizes are `src/router/route.ts` 301 lines, `src/router/index.ts` 20, `src/sampler/assemble.ts` 191, `src/sampler/sample.ts` 195, `src/sampler/index.ts` 90, `src/watch/extension.ts` 499, and `src/contract/watched-frame-set.ts` 308. The change preserves pure routing/assembly cores and explicit effects. No lint or complexity runner is configured. `extension.ts` remains a measured decomposition candidate just below the 500-line advisory; Phase 22 correctly avoided unrelated extraction, and the existing ROADMAP deferred-debt entry already owns that concern.

## Deviations and Issues Encountered

| Type | Count | Resolution |
|---|---:|---|
| Approved file-scope addition | 5 paths | Added the source contract validator and four generated counterparts needed to represent transcript-only sets with zero FPS without weakening frame-bearing invariants. |
| Hardening additions | 2 commits | Applied question-derived OCR resolution before decode and tightened temporal/FPS regressions after review; all changes received focused tests and full verification. |
| Dependency/architecture deviation | 0 | No dependency, config, model, persistence, cloud, tier-order, or unrelated decomposition change. |
| GitHub Flow sequencing issue | 1 | PR #33 was merged before last-plan UNIFY transition metadata. Implementation remains valid; UNIFY continues on `feature/22-unify-finalize` so SUMMARY and Phase 23 transition artifacts can pass their own PR/CI/merge gate. |

## Phase 23 Handoff Constraints

- Preserve the approved broad/spoken/mixed transcript-first policy, on-screen-text precedence, explicit temporal detection, and shared spoken/mixed-only ASR eligibility.
- Prove through the manifest-declared compiled registration that transcript-backed tier 1 invokes neither scene detection nor frame decode; do not claim that source resolution, duration probing, caption lookup, or eligible ASR is avoided.
- Preserve Phase 20 caption normalization and every Phase 21 range, clipping, absolute-offset, available-versus-returned coverage, output-bound, diagnostic, cleanup, and fallback guarantee.
- Phase 23 remains limited to R8 quoted local references, R18 adapter ceilings, R22 test-owned npm-cache proof, R4/R6 terminology reconciliation, compiled-package efficiency proof, and operator guidance.
- Do not add dependencies, persistent transcript state, model-backed synthesis, cloud requirements, semantic adequacy scoring, broad-only ASR, per-item batch ranges, or unrelated hotspot decomposition.

## Next Phase Readiness

**Ready:**
- Transcript-first control flow and deterministic policy are implemented, tested, documented, compiled, and merged.
- Exact zero-call and visual-fallback assertions exist for Phase 23 package-level proof.

**Concerns:**
- `src/watch/extension.ts` is 499 lines; decomposition remains deferred and outside M5 unless Phase 23 requires a strictly local tested extraction.
- GitHub Flow sequencing must complete through the dedicated UNIFY-finalization PR before Phase 23 planning is exposed.

**Blockers:** None. Phase 23 planning is available after the dedicated UNIFY-finalization PR passes its merge gate.

---
*Phase: 22-route-before-decoding, Plan: 01*
*UNIFY reconciliation: 2026-08-13*
