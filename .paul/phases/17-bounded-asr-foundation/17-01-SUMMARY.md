---
phase: 17-bounded-asr-foundation
plan: 01
subsystem: sampler
tags: [asr, mlx-whisper, captions-first, local-first, research]
requires:
  - phase: 15-caption-transcript-pipeline
    provides: captions-first transcript acquisition and bounded shared timeline
  - phase: 16-end-to-end-url-ux
    provides: resolved originalRef/mediaRef ownership and bounded live-proof conventions
provides:
  - observed mlx-whisper 0.4.3 executable and timestamped JSON contract
  - bounded Apple Silicon cold/warm whisper-tiny baseline
  - decision-complete captions-first local-ASR implementation boundary and TDD matrix
affects:
  - local transcript fallback
  - local speech UX and proof
tech-stack:
  added: []
  patterns: [extension-gated spoken intent, captions-first ASR fallback, explicit executable effect boundary]
key-files:
  created:
    - .paul/phases/17-bounded-asr-foundation/17-01-RESEARCH.md
  modified: []
key-decisions:
  - "Gate explicitly enabled local ASR at the extension boundary for spoken intent only."
  - "Target the direct mlx_whisper console contract and keep package/model caches user-owned."
  - "Preserve captions first and degrade every ASR failure to the existing visual tier chain."
patterns-established:
  - "Pass a narrow ASR policy into sample; do not pass question text into sampler effects."
  - "Own only adapter-created output storage; borrow media and user package/model caches."
duration: 28min
started: 2026-08-09T21:42:20-04:00
completed: 2026-08-09T22:10:42-04:00
---

# Phase 17 Plan 01: Bounded Local ASR Research Summary

**Verified the real `mlx-whisper` runtime, measured one bounded local baseline, and selected an implementation-ready captions-first ASR boundary without changing production code or dependencies.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | 28 minutes |
| Started | 2026-08-09T21:42:20-04:00 |
| Completed | 2026-08-09T22:10:42-04:00 |
| Tasks | 3 completed |
| Planned files changed | 1 |
| Production files changed | 0 |

## Acceptance Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| AC-1: Supported executable contract is observed | PASS | `mlx-whisper 0.4.3`, the `mlx_whisper` console script, exact argv, JSON segment schema, failure modes, cache effects, and cleanup are recorded in `17-01-RESEARCH.md`. The tagged assertion and protected-file diff passed during APPLY and UNIFY. |
| AC-2: Bounded target-hardware baseline is reproducible | PASS | The 9,696 ms fixture completed in 5,957 ms cold and 1,158 ms warm with a 1,247-byte JSON output and 89,243,648-byte model-cache delta; timestamps, transcript evidence, hard bounds, privacy, and cleanup all passed. |
| AC-3: Follow-up implementation boundary is decision-complete | PASS | The artifact selects extension-boundary spoken-intent gating, captions-first ASR fallback, focused `src/sampler/asr.ts` ownership, provisional defaults, exact files, and a RED/GREEN/REFACTOR matrix. The tagged assertion and protected-file diff passed. |

## Spec Deltas and Routing

No deltas

## Module Execution Reports

[dispatch] pre-unify: 0 modules registered for this hook.

### WALT

**Status: PASS.** Post-unify used APPLY-captured evidence and did not re-run checks for its delta calculation. Baseline and final results were both 210 passing / 2 skipped tests; typecheck and build passed, no lint runner is configured, and production/dependency files were unchanged. Quality trajectory: stable. A `17-01` row was appended to `.paul/QUALITY-HISTORY.md`.

### SKIP

**Status: NOTE.** The selected boundary is durable knowledge: explicit spoken-intent opt-in at the extension, captions-first acquisition, direct external `mlx_whisper` execution, adapter-owned output cleanup, user-owned package/model caches, and visual fallback on every failure. Source: `17-01-RESEARCH.md`, `AC-3 Boundary decision`; lifecycle scope: Phase 17 Plan 01; impact: the next local-transcript implementation plan can use the recorded API, ownership, defaults, files, and TDD matrix without guessing. No separate lifecycle artifact was mutated by SKIP.

### CODI

**Status: PASS.** PLAN evidence records an injected blast radius for five resolved symbols, zero unresolved symbols, and 14 total call-sites: `fetchTranscript`, `sample`, `classifyQuestion`, `resolveWatchConfig`, and `watchExtension`. A normalized `17-01` row was appended to `.paul/CODI-HISTORY.md`.

### RUBY

**Status: SKIP.** `NOT_APPLICABLE` — changed plan output is a `.paul/*` research artifact and no readable production source file changed, so there is no changed-source code-debt finding.

[dispatch] post-unify: WALT PASS; SKIP NOTE; CODI PASS; RUBY skipped — documentation-only research scope. No module blocked UNIFY.

## Accomplishments

- Observed the public `mlx_whisper` console contract, including stable timestamped JSON and typed failure signals, instead of encoding guessed flags or output.
- Measured one cleaned, finite Apple Silicon baseline using only plan-created temporary package, model, media, and output storage.
- Selected the smallest implementation boundary that keeps question classification pure, captions preferred, ASR explicitly enabled and duration-bounded, ownership explicit, and visual fallback unchanged.
- Produced exact source/test candidates and a TDD matrix for the local transcript fallback implementation.

## Task and Verification Results

| Task | Commit | Result | Verification |
|------|--------|--------|--------------|
| Task 1: Verify executable contract | `22ad11c` | PASS | AC-1 tagged assertion and protected production/dependency diff passed. |
| Task 2: Measure bounded baseline | `9e8c901` | PASS | AC-2 tagged assertion passed; fixture, transcript, timestamps, bounds, and cleanup evidence recorded. |
| Task 3: Select implementation boundary | `4bb4487` | PASS | AC-3 tagged assertion, protected-file diff, and `git diff --check` passed. |
| Final APPLY gate | `f2fe95e` | PASS | 210 tests passed / 2 skipped; typecheck and build passed; protected files and temporary-storage cleanup passed; audit remained 0 critical / 4 high / 2 moderate. |

UNIFY independently re-ran all three tagged artifact assertions, `npm test`, `npm run typecheck`, `npm run build`, protected-file checks, and `git diff --check`; all passed with 210 tests passing and 2 skipped.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `.paul/phases/17-bounded-asr-foundation/17-01-RESEARCH.md` | Created | Runtime evidence, measured bounds, selected architecture, rejected alternatives, provisional defaults, exact implementation files, and TDD matrix. |

No `src/**`, `test/**`, `dist/**`, `package.json`, or `package-lock.json` file changed during APPLY.

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Classify spoken intent at the extension and pass a narrow optional ASR policy into `sample` | Keeps router policy pure and question text out of sampler effects while reusing existing single/batch composition. | Enabled spoken questions can request ASR; visual/on-screen-text questions and disabled config do not incur model work. |
| Keep captions first and run local ASR only after a valid caption miss | Preserves the cheapest-path discipline and existing human/automatic caption preference. | Captioned media remains unchanged; every ASR error still leaves visual tiers available. |
| Invoke the direct `mlx_whisper` executable rather than embedding Python or auto-running `uvx` | The console script already emits stable JSON, while the package-only temporary uv cache measured roughly 2.09 GB. | Installation and model caches remain explicit user prerequisites rather than hidden watch-call side effects. |
| Create a focused `src/sampler/asr.ts` effect boundary | ASR process/filesystem ownership does not belong in the already broad sampler effects module. | The next implementation can keep parsing/config logic directly testable and cleanup narrowly owned without unrelated refactoring. |

## Deviations from Plan

None. The research plan changed only its declared research artifact, used one model candidate, stayed inside all download/time/output/privacy/ownership bounds, cleaned all plan-created storage, and made no production or dependency change.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| The first cold/warm timing attempt included package setup overhead. | Re-ran the bounded measurement after isolating package installation from transcription timing and recorded the cleaned 5,957 ms cold / 1,158 ms warm baseline. |

## Next Phase Readiness

**Ready:**
- Observed executable, argv, JSON schema, errors, cache ownership, and resource measurements.
- Exact parser/process/config/sampler/extension behavior and test cases for local transcript fallback.
- Evidence-based defaults for opt-in enablement, tiny model, English transcription, duration, timeout, and output bounds.

**Concerns:**
- The external executable and model remain user-managed prerequisites; setup and user-facing diagnostics still need implementation and documentation.
- The single tiny-model fixture proves the seam, not general accuracy, memory behavior, or long-media scalability.
- Existing dependency audit remains 0 critical / 4 high / 2 moderate and is unchanged by this plan.

**Blockers:** None.

---
*Phase: 17-bounded-asr-foundation, Plan: 01*
*Completed: 2026-08-09*
