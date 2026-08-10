---
phase: 19-local-speech-ux-and-proof
plan: 01
subsystem: testing
status: complete
tags: [asr, mlx-whisper, local-first, package-boundary, documentation]
requires:
  - phase: 18-local-transcript-fallback
    provides: bounded captions-first local ASR, typed diagnostics, visual fallback, and distributable compiled extension
provides:
  - bounded deterministic synthetic English speech fixture and inspectable manifest
  - registered compiled-extension proof for private missing-executable fallback
  - explicit default-skipped real mlx_whisper proof path
  - local-ASR setup, diagnostics, ownership, privacy, and package installation guidance
affects:
  - local speech operations
  - release verification
  - package installation documentation
tech-stack:
  added: []
  patterns: [compiled registration acceptance proof, exact-opt-in live integration test, deterministic synthetic media evidence]
key-files:
  created:
    - test/fixtures/asr/english-speech.mp4
    - test/fixtures/asr/english-speech.fixture.json
    - test/watch/asr-e2e.test.ts
    - docs/LOCAL-ASR-SETUP.md
  modified:
    - README.md
    - package.json
    - package-lock.json
key-decisions:
  - "Keep real mlx_whisper proof exact-opt-in, finite, and non-blocking when user-managed prerequisites are absent."
  - "Prove the package.json-declared compiled registration rather than importing production TypeScript directly."
  - "Reconcile only root package and lock metadata to v0.4.0; preserve source, dist, dependencies, scripts, peers, and manifest policy."
patterns-established:
  - "Use deterministic failure through the registered distributable boundary as the default-safe external-tool proof."
  - "Pair optional live model proof with an exact flag, finite timeout, actionable prerequisites, and visible default skip."
duration: 4min task-commit span
started: 2026-08-10T09:56:57-04:00
completed: 2026-08-10T10:00:41-04:00
---

# Phase 19 Plan 01: Local Speech Operability and Installed Proof Summary

**Closed v0.4 with deterministic synthetic speech evidence, registered compiled-extension fallback proof, an exact-opt-in live-ASR path, complete operator diagnostics, and v0.4.0 package metadata without changing production behavior or dependencies.**

## Performance

| Metric | Value |
|--------|-------|
| Task commit span | 4 minutes |
| First task commit | 2026-08-10T09:56:57-04:00 |
| Final task commit | 2026-08-10T10:00:41-04:00 |
| Tasks | 2 completed |
| Planned output files changed | 7 |
| Production source files changed | 0 |

## Acceptance Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| AC-1: Bounded deterministic English speech fixture | PASS | Commit `d6a5466` added a 66,661-byte, 9.149-second synthetic MP4 and manifest. Tagged tests verify SHA-256 identity, exact phrase/evidence words, generation provenance, one audio stream, one video stream, duration, and size without ASR or network work. |
| AC-2: Registered distributable tool preserves private typed fallback | PASS | The acceptance suite imports the `package.json`-declared compiled extension, captures the real `watch` registration, forces a guaranteed-missing executable, and receives tier-3 frames with `transcriptSource: none` and `missing-executable` details free of refs, transcript, stderr, cache paths, credentials, and environment values. |
| AC-3: Real local-ASR proof is explicit, finite, and default-safe | PASS | The real-model case is gated only by exact `WATCH_ASR_LIVE=1`, has bounded test/production timeouts, and is visibly skipped by default. No user-managed executable/model prerequisites were supplied during APPLY, so the optional live run was correctly not invoked and did not block completion. |
| AC-4: Accurate setup, diagnostics, verification, and v0.4 packaging | PASS | Commit `fded72d` added `docs/LOCAL-ASR-SETUP.md`, refreshed README guidance, reconciled root package/lock versions to 0.4.0, and extended tagged checks for all config keys, typed reasons, ownership/privacy, supported Git/local installation, manifest path, and packed `dist/watch/extension.js`. |

## Spec Deltas and Routing

No deltas

## Module Execution Reports

[dispatch] pre-unify: 0 modules registered for this hook.

### WALT

**Status: PASS.** Post-unify computed its delta from APPLY-captured evidence without re-running checks: 245 passing / 2 skipped tests before APPLY and 248 passing / 3 skipped after APPLY, with typecheck and build passing and no lint runner configured. Quality trajectory improved by three passing tests with no regression. A normalized `19-01` row was appended to `.paul/QUALITY-HISTORY.md`.

### SKIP

**Status: NOTE.** Source-backed knowledge retained: external-model acceptance should use a deterministic failure path through the registered distributable boundary by default, while real `mlx_whisper` remains exact-opt-in, finite, and user-managed. Source: this SUMMARY, `Decisions Made`, backed by PLAN acceptance criteria and APPLY evidence; date: 2026-08-10; type: decision; phase/plan: 19/19-01; context: proving local-speech operability without hidden model installation or network work; impact: future release verification can preserve deterministic private fallback evidence while allowing intentional machine-specific tier-1 proof.

### CODI

**Status: SKIP.** PLAN evidence records `CODI: skipped — codegraph impact tools unavailable`; normalized outcome `skipped-tool-unavailable`, with no invented symbols or counts. A normalized `19-01` row was appended to `.paul/CODI-HISTORY.md`.

### RUBY

**Status: SKIP.** `NOT_APPLICABLE` — no readable production source file changed; the scoped changes are tests, synthetic evidence, documentation, and root version metadata, so there is no changed-source code-debt finding.

[dispatch] post-unify: WALT PASS; SKIP NOTE; CODI skipped-tool-unavailable; RUBY skipped — no changed production source. No module blocked UNIFY.

## Accomplishments

- Committed one bounded synthetic English speech fixture with a machine-checkable identity, phrase, evidence words, provenance, duration, stream layout, and size ceilings.
- Exercised the actual manifest-declared compiled Pi extension registration and proved private `missing-executable` diagnostics plus tier-3 visual fallback without model or network work.
- Added an exact-opt-in, finite, default-skipped real `mlx_whisper` correctness path through the same registered tool boundary.
- Published complete Apple-Silicon-oriented setup, configuration, failure remediation, ownership/privacy, verification, and limits guidance.
- Reconciled package and root lock metadata to v0.4.0 while preserving production source, committed `dist/**`, dependency tree, scripts, peers, package name, CI, and extension manifest policy.

## Task and Verification Results

| Task | Commit | Result | Verification |
|------|--------|--------|--------------|
| Task 1: Commit deterministic speech evidence and exercise compiled registration | `d6a5466` | PASS | Focused build/test passed AC-1 and AC-2; AC-3 was visibly default-skipped; fixture hash, ffprobe bounds, privacy assertions, tier-3 fallback, and whitespace passed. |
| Task 2: Publish v0.4 local-ASR setup, diagnostics, and package proof | `fded72d` | PASS | AC-4, full suite, typecheck, build, package dry-run, unchanged `dist/**`, root version agreement, protected scope, audit comparison, and whitespace passed. |
| Final APPLY gate | `fded72d` | PASS | 248 tests passed / 3 skipped; typecheck, build, package dry-run, fixture bounds/hash/probe, protected-file checks, and audit at 0 critical / 4 high / 2 moderate / 0 low all passed with no dependency-tree delta. |

UNIFY re-ran `npm test`, `npm run typecheck`, and `npm run build`; all passed with 248 tests / 3 skipped.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `test/fixtures/asr/english-speech.mp4` | Created | Bounded synthetic audio/video correctness evidence. |
| `test/fixtures/asr/english-speech.fixture.json` | Created | Stable hash, phrase, evidence words, generation provenance, and media ceilings. |
| `test/watch/asr-e2e.test.ts` | Created | Tagged AC-1 through AC-4 proof through the registered compiled extension. |
| `docs/LOCAL-ASR-SETUP.md` | Created | Operator setup, configuration, diagnostics, ownership/privacy, proof commands, and limits. |
| `README.md` | Modified | v0.4 local-speech flow, install guidance, opt-in example, runbook link, and development proof. |
| `package.json` | Modified | Root version reconciled from 0.3.0 to 0.4.0 only. |
| `package-lock.json` | Modified | Corresponding root lock metadata reconciled to 0.4.0 only. |

Every applicable planned file changed. No unplanned implementation file changed; `.paul/*` changes are normal lifecycle artifacts.

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Keep the real model proof exact-opt-in and default-skipped | `mlx_whisper`, model data, Apple Silicon, and first-use downloads are user-managed external prerequisites unsuitable for deterministic offline tests. | Normal development and CI remain model-free; maintainers can intentionally run the same bounded fixture through tier 1 when prerequisites exist. |
| Prove the manifest-declared compiled registration | Git/local Pi installs load committed `dist/watch/extension.js`, so source-only mocks would not prove the distributable boundary. | Acceptance evidence covers actual `watch`, `watch_batch`, and `/watch` registration while executing `watch` through the host-facing tool contract. |
| Use deterministic missing-executable failure as the default integration path | It exercises the real process/config/diagnostic/fallback composition without network, model cache, or machine-specific setup. | Every normal run proves actionable private diagnostics and universal tier-3 fallback. |
| Limit release metadata changes to root package versions | The phase proves already-shipped behavior and must not alter dependencies, scripts, peers, package identity, or compiled output. | v0.4.0 metadata is accurate while the installed architecture and dependency baseline remain unchanged. |

## Deviations from Plan

None. The optional real-model AC-3 execution was not run because no user-managed compatible executable/model prerequisites were intentionally supplied; the plan explicitly defines that absence as a non-blocking, visibly skipped default path.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- v0.4 local speech is operable and documented from explicit setup through typed remediation and deterministic package-boundary proof.
- The milestone can close after lifecycle transition and the required GitHub Flow merge gate.
- Future release work can use the v0.4.0 checkout while preserving the warning that no installable Git tag should be claimed until actually created.

**Concerns:**
- Real `mlx_whisper` proof remains machine-specific and must stay explicit, finite, and user-managed.
- The unchanged dependency tree reports 0 critical / 4 high / 2 moderate advisories.
- Advanced ASR features, dedicated CI, and scoped npm publication remain deferred.

**Blockers:** None.

---
*Phase: 19-local-speech-ux-and-proof, Plan: 01*
*Completed: 2026-08-10*
