---
phase: 23-harden-and-prove
plan: 01
subsystem: watch-sampler-router-package
status: complete
serves: [R4, R6, R8, R18, R22]
tags: [hardening, quoted-refs, asr-ceilings, context-efficiency, compiled-proof, docs, tdd]
requires:
  - phase: 22-route-before-decoding
    provides: deterministic transcript-first staged routing and zero-frame tier-1 sets
provides:
  - narrow leading-quote `/watch` local-ref grammar with no shell semantics
  - exported-boundary ASR duration/timeout clamping to compiled ceilings
  - hermetic test-owned npm cache for the nested package proof
  - versioned synthetic corpus and registered-`dist` transcript-efficiency proof
  - v0.5.0 package metadata and transcript-first operator guidance
affects:
  - watch
  - sampler
  - router
  - docs
tech-stack:
  added: []
  patterns: [Pure Core Explicit Effects, bounded effective-limit selection, test-owned effect shims]
key-files:
  created:
    - test/watch/context-efficiency.test.ts
    - test/fixtures/context-efficiency/transcript-first.fixture.json
    - docs/TRANSCRIPT-FIRST.md
  modified:
    - src/watch/command.ts
    - src/sampler/asr.ts
    - src/router/route.ts
    - src/watch/tier2.ts
    - src/watch/tier-runner.ts
    - src/watch/extension.ts
    - src/watch/index.ts
    - src/contract/watched-frame-set.ts
key-decisions:
  - "`/watch` accepts exactly one leading matching single/double quote pair around a non-empty ref; escapes, concatenation, nested quoting, and variables are rejected rather than interpreted."
  - "Effective ASR duration/timeout are derived at the exported adapter boundary, so direct callers cannot exceed compiled ceilings while lower positive limits stay authoritative."
  - "Context-efficiency evidence is corpus-scoped and machine-checked against a committed synthetic fixture; no general latency, percentage, or answer-quality claim is made."
patterns-established:
  - "Clamp caller-supplied resource policies to compiled ceilings before any duration comparison or process spawn."
  - "Prove package-level behavior through the first `package.json.pi.extensions` path with test-owned executable shims and a call ledger."
duration: 13m08s task-commit span
started: 2026-08-13T14:52:31Z
completed: 2026-08-13T15:05:39Z
pr: https://github.com/coctostan/pi-watch/pull/36
merge_commit: 36a03fb62deaae323218b27d05a32d03db030721
---

# Phase 23 Plan 01: Bounded Hardening and Compiled Transcript-Efficiency Proof Summary

**Closed the five routed M4 audit follow-ups at their approved narrow surfaces and proved through the manifest-declared compiled v0.5.0 registration that transcript-backed calls return tier 1 with zero `ffmpeg` work and far smaller serialized context than a same-corpus visual control.**

## Acceptance Criteria Results

| Criterion | Status | Evidence |
|---|---|---|
| AC-1 (R8, R18): RED specifies quoted refs and exported ASR ceilings | PASS | Test-only commit `57b686b` added `[phase23][R8]` quote-grammar cases and `[phase23][R18]` direct-call ceiling cases to `test/watch/command.test.ts` and `test/sampler/asr.test.ts` before any production edit. RED failed only on the new Phase 23 expectations. |
| AC-2 (R4, R6, R8, R18, R22): GREEN closes the bounded audit defects | PASS | Commit `c25edac` added the narrow quote parser, boundary limit clamping, the test-owned npm cache, and sampled-frame terminology alignment. Focused suites across command, ASR, route, unconfigured-hint, and ASR-e2e tests pass; `npm run typecheck` passes. |
| AC-3 (R4, R6, R8, R18, R22): REFACTOR proves the compiled v0.5 package and publishes guidance | PASS | Commit `cb6bcff` added the versioned corpus plus registered-`dist` harness, v0.5.0 metadata, and operator docs. UNIFY re-verified 362 passed / 3 skipped (baseline 337/3), typecheck pass, reproducible `dist/**` (`git diff --exit-code -- dist` clean), and `git diff --check` clean. |

## Exact Corpus Evidence (corpus-scoped, not a general benchmark)

Fixture: `test/fixtures/context-efficiency/transcript-first.fixture.json` (schemaVersion 1, packageVersion `0.5.0`, synthetic 22 s media, 10 raw cues).

| Case | Intent | Range (ms) | Tier | Frames | Scene calls | Decode calls | Result bytes |
|---|---|---|---:|---:|---:|---:|---:|
| "What does the speaker say?" | spoken | `[0, 22000)` | 1 | 0 | 0 | 0 | 1,374 |
| "Summarize the recommendations…" | broad | `[0, 22000)` | 1 | 0 | 0 | 0 | 1,394 |
| "Analyze this requested subsection." | broad + range | `[4000, 12000)` | 1 | 0 | 0 | 0 | 1,077 |
| Visual control, same corpus | visual | `[0, 22000)` | 3 | 2 | 1 | 2 | 7,144 |

- Transcript normalization is unchanged from Phase 20: 301 raw → 235 normalized UTF-8 bytes.
- Available/returned transcript counts are 9/9 for full-range cases and 4/4 for the requested subsection, preserving Phase 21 range and coverage semantics.
- Visual-control work is positive and budget-bounded (`sceneCalls + decodeCalls` ≤ `budget + 1`); each transcript case asserts an empty `ffmpeg` ledger rather than a percentage estimate.

## Task and Verification Results

| Task | Commit | Result | Verification |
|---|---|---|---|
| Task 1 — RED: specify quoted refs and adapter ceilings | `57b686b` | PASS | Focused command/ASR suites exited non-zero only on new `[phase23][R8]` / `[phase23][R18]` assertions; no production file touched. |
| Task 2 — GREEN: close parser, adapter, cache, and terminology gaps | `c25edac` | PASS | Focused command, ASR, route, unconfigured-hint, and ASR-e2e suites exit 0; typecheck passes; tier order, question classification, and diagnostics unchanged. |
| Task 3 — REFACTOR/prove: compiled evidence and v0.5 guidance | `cb6bcff` | PASS | Build → context-efficiency/ASR-e2e → full suite → typecheck → rebuild → `git diff --exit-code -- dist` → `git diff --check` all pass. |

**UNIFY independent re-verification (2026-08-13):** `npm test` → 20 files passed / 2 skipped, **362 passed / 3 skipped**; `npm run typecheck` pass; second `npm run build` leaves committed `dist/**` byte-identical; `git diff --check` clean.

**Dependency evidence:** `npm audit --json` reports 0 critical / 4 high / 2 moderate / 0 low — identical to the pre-plan 0/4/2/0 comparison baseline. No dependency, peer range, script, or package-surface change; only `version` metadata moved to `0.5.0` in `package.json` and the lockfile root.

## Behavior Closed by Routed Finding

| Finding | Requirement | Closure |
|---|---|---|
| F9 | R8 | `parseWatchCommand` recognizes one leading matching `'`/`"` pair wrapping a non-empty ref, requires whitespace plus a non-empty question after the closing quote, and preserves interior spaces verbatim. Empty quoted refs, missing closing quotes, missing questions, and non-whitespace after the closing quote fail with the usage string. Escapes, concatenation, nested quoting, and variables are explicitly not interpreted; unquoted input keeps the legacy first-token grammar. |
| F11 | R18 | `fetchLocalAsrTranscript` derives finite effective duration/timeout via `boundedPositiveLimit` before the duration check and before any process spawn. Non-finite or over-ceiling caller values collapse to the compiled ceiling; lower positive caller values remain authoritative. The `duration-limit` diagnostic now reports the effective limit, and the fixed 16 MiB output bound, argv-only execution, ownership, and fallbacks are unchanged. |
| F8 | R22 | The nested `npm pack --dry-run --json` proof allocates a unique OS-temp npm cache, passes it only through the child environment, is proven not to depend on an unusable ambient cache, and removes both temporary roots in `finally`. Package/lock/README/runbook assertions moved to `0.5.0`; live model checks remain exact-opt-in and default-skipped. |
| F15 | R4 | Transcript-present rationale now states a deterministic transcript-presence policy with ordered fallbacks instead of promising later semantic-inadequacy escalation. Tier order, intent classification, and ASR eligibility are unchanged. |
| F14 | R6 | Implemented tier 2 is consistently described as OpenAI-compatible sampled-frame vision across router rationale, tier modules, contract comments, extension hints, and docs. "Native video" survives only where it labels the deferred ingestion path. |

## Files Reconciled

The approved PLAN named 54 paths. PR #36 changed **46 of those 54 paths and zero unplanned paths**.

The 8 planned-but-unchanged paths are generated counterparts that were byte-identical after the rebuild:

- `dist/contract/watched-frame-set.js.map`, `dist/contract/watched-frame-set.d.ts.map`
- `dist/sampler/asr.d.ts`
- `dist/watch/extension.d.ts`, `dist/watch/extension.d.ts.map`
- `dist/watch/index.js.map`, `dist/watch/index.d.ts.map`
- `dist/watch/tier2.d.ts.map`

This is reproducible-build evidence, not a scope deviation: comment/terminology-only source edits produced no declaration or map churn for those modules.

## Spec Deltas and Routing

All five pre-filled candidates were approved as proposed in one blocking human review on 2026-08-13.

| # | Type | Target | Delta | Proposed route | Human decision | Result |
|---|---|---|---|---|---|---|
| 1 | MODIFIED | R8 | `/watch` accepts one leading matching single/double-quoted non-empty local ref with interior spaces preserved; escapes, variable expansion, nested quoting, and concatenation are rejected rather than interpreted | `prd-amend` | approved as proposed | R8 amended in place in `.paul/PRD.md` with Phase 23 / plan 23-01 and SUMMARY-path provenance |
| 2 | MODIFIED | R18 | Effective duration/timeout are clamped at the exported adapter boundary so direct callers cannot exceed compiled ceilings | `discard` | approved as proposed | Decision recorded only; R18 already states this intent verbatim and the implementation now matches it |
| 3 | MODIFIED | R4, R6 | Router rationale and implemented tier-2 descriptions reconciled to deterministic transcript presence and OpenAI-compatible sampled-frame vision | `discard` | approved as proposed | Decision recorded only; PRD R4/R6 already carried the correct wording, so only source and doc drift was repaired |
| 4 | ADDED | M5 | Corpus-scoped compiled proof: 1,374 / 1,394 / 1,077 tier-1 result bytes with zero `ffmpeg` calls versus a same-corpus 7,144-byte visual control with 1 scene and 2 decode calls | `discard` | approved as proposed | Decision recorded only; the metrics are already durable in this SUMMARY and in STATE Accumulated Context |
| 5 | DEFERRED | M5 deferred issues | RUBY measured `src/watch/tier-runner.ts` at 642 lines and `src/watch/extension.ts` at 499; decomposition stays out of scope | `discard` | approved as proposed | Decision recorded only; the deferral is already listed in `.paul/ROADMAP.md` and STATE Deferred Issues |

## Module Execution Reports

- `[dispatch] pre-unify: 0 modules registered for this hook.`
- `[dispatch] post-unify: 4 modules dispatched — WALT (100), SKIP (200), CODI (220), RUBY (300).`

### WALT

**Status: PASS.** Computed from APPLY-captured reports plus the UNIFY re-verification recorded above, without re-running checks inside the module: 337 passed / 3 skipped before APPLY and 362 passed / 3 skipped after; typecheck passes; two consecutive builds leave committed `dist/**` byte-identical; no lint runner is configured. Delta is ▲ improved (+25 tests) with no regression. A normalized `23-01` row was appended to `.paul/QUALITY-HISTORY.md` during UNIFY.

### SKIP

**Status: NOTE.** Two complete source-backed knowledge entries are available from this SUMMARY. (1) Clamp caller-supplied resource policies to compiled ceilings at the exported boundary, before any comparison or spawn, so ceilings hold for direct callers while lower positive limits stay authoritative. (2) Prove package-level behavior by loading the first `package.json.pi.extensions` path after build and driving it with test-owned executable shims plus a call ledger, which yields exact zero-work evidence instead of an estimate. Impact: both patterns are reusable for any future adapter ceiling or compiled-package proof without adding dependencies or persistent state.

### CODI

**Outcome: `skipped-tool-unavailable`.** The PLAN's canonical CODI log records SKIP because no `impact` tool is exposed in this harness; explicit seeds existed but no blast-radius counts or call sites were invented, and `.codegraph/` remains non-authoritative and untracked. A `23-01` row was appended to `.paul/CODI-HISTORY.md` with `blast_radius=n` during UNIFY.

### RUBY

**Status: PASS_WITH_CONCERNS.** Measured changed readable source sizes are `src/watch/command.ts` 112 lines, `src/sampler/asr.ts` 229, `src/router/route.ts` 300, `src/watch/index.ts` 74, `src/watch/tier2.ts` 313, `src/watch/tier-runner.ts` 642, `src/watch/extension.ts` 499, and `src/contract/watched-frame-set.ts` 308. The change preserves pure cores (total parser, deterministic limit selection) with explicit effects at process, filesystem, and package boundaries; `boundedPositiveLimit` is a small extracted pure helper. No lint or complexity runner is configured. `tier-runner.ts` (642) and `extension.ts` (499) remain measured decomposition candidates; decomposition is explicitly deferred by plan boundaries and was approved as `discard` in delta routing above.

## Deviations and Issues Encountered

| Type | Count | Resolution |
|---|---:|---|
| Unplanned file change | 0 | Every changed path was named in the approved PLAN. |
| Planned-but-unchanged generated path | 8 | Byte-identical rebuild output; recorded as reproducibility evidence above. |
| Boundary violation | 0 | Tier order, question classification, range/coverage semantics, output bounds, ownership, diagnostics, and tier-3 totality are unchanged. No dependency, CI workflow, package rename, or hotspot decomposition was introduced. |
| Deferred debt carried forward | 1 | `src/watch/tier-runner.ts` remains 642 lines and `src/watch/extension.ts` 499; decomposition stays deferred per plan boundaries. |

## Next Phase Note

Phase 23 is the last declared plan of M5, so UNIFY routes to milestone transition. v0.5.0 metadata, reproducible `dist/**`, operator guidance (`docs/TRANSCRIPT-FIRST.md` linked from README), and corpus-scoped efficiency evidence are in place for release readiness. Persistent transcript handles, model-backed synthesis, tier-3 batch fan-out, optional cloud tiers, dedicated CI, dependency remediation, and hotspot decomposition remain deferred.

---
*Phase: 23-harden-and-prove, Plan: 01*
*UNIFY reconciliation: 2026-08-13*
