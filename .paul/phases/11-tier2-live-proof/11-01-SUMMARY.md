---
phase: 11-tier2-live-proof
plan: 01
subsystem: testing
tags: [tier2, live-test, mlx-vlm, qwen3-vl, vitest, openai-compatible]
requires:
  - phase: 10-standup-model
    provides: local mlx_vlm.server endpoint and WATCH_TIER2_* values
  - phase: 06-tier-adapters
    provides: buildTier2Request / parseTier2Answer tier-2 adapter path
provides:
  - opt-in live Vitest proof for the real tier-2 OpenAI-compatible wire shape
  - documented WATCH_TIER2_LIVE command for local endpoint verification
affects:
  - Phase 12: Tier-2 failure diagnostics
  - docs/TIER2-SETUP.md
tech-stack:
  added: []
  patterns: [opt-in live integration test, default-skipped network proof]
key-files:
  created: [test/watch/tier2.live.test.ts]
  modified: [docs/TIER2-SETUP.md]
key-decisions:
  - "Decision: keep live tier-2 verification opt-in so default npm test remains CI-safe"
  - "Decision: no production adapter change was needed after the real endpoint accepted the existing wire shape"
patterns-established:
  - "Pattern: live model tests are gated by WATCH_TIER2_LIVE=1 and skipped by default"
  - "Pattern: local tier-2 proof uses production buildTier2Request plus parseTier2Answer, not a model-specific request branch"
duration: 5min
started: 2026-06-24T12:47:00-07:00
completed: 2026-06-24T12:52:00-07:00
---

# Phase 11 Plan 01: Tier-2 Live Wire-Shape Proof Summary

**The production tier-2 request/response seam has now touched a real local Qwen3-VL endpoint: an opt-in Vitest proof sends `buildTier2Request` output to `mlx_vlm.server`, parses the real response with `parseTier2Answer`, and defaults to skipped for CI/offline runs.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~5min APPLY execution |
| Started | 2026-06-24T12:47:00-07:00 |
| Completed | 2026-06-24T12:52:00-07:00 |
| Tasks | 3 completed |
| Files modified | 2 committed files (`test/watch/tier2.live.test.ts`, `docs/TIER2-SETUP.md`) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Live test is opt-in and CI-safe | PASS | `npm test -- test/watch/tier2.live.test.ts` exits 0 with 1 skipped test when `WATCH_TIER2_LIVE` is absent; full `npm test` reports 11 passed files + 1 skipped file, 125 passed tests + 1 skipped test. |
| AC-2: Real tier-2 wire shape reaches the local endpoint | PASS | `WATCH_TIER2_LIVE=1 WATCH_TIER2_BASE_URL="http://localhost:8080/v1" WATCH_TIER2_MODEL="mlx-community/Qwen3-VL-8B-Instruct-4bit" npm test -- test/watch/tier2.live.test.ts` passed against the running local server. |
| AC-3: Wire-shape fixes stay model-agnostic | PASS | No production mismatch was observed, so `src/watch/tier2.ts` stayed unchanged. The live proof uses production `buildTier2Request` + `parseTier2Answer` and contains no Qwen-specific production branch. |
| AC-4: Operators can reproduce the proof | PASS | `docs/TIER2-SETUP.md` now documents `WATCH_TIER2_LIVE=1`, the localhost base URL/model exports, the focused Vitest command, default-skip behavior, and local API-key guidance. |

## Module Execution Reports

### Pre-UNIFY

`[dispatch] pre-unify: 0 modules registered for this hook`.

### APPLY carried-forward reports

| Module | Result | Evidence |
|--------|--------|----------|
| TODD | PASS | Execute plan with test-first characterization; Task 1 focused command skipped safely by default; Task 2 live proof passed; no production mismatch required deterministic production regression coverage. |
| WALT | PASS | Baseline `npm test`: 11 files passed, 125 tests passed. Post-apply checks passed: focused skipped live test, focused live proof, full `npm test` (11 passed + 1 skipped files; 125 passed + 1 skipped tests), `npm run typecheck`, `npm run build`, and `npm audit --audit-level=moderate` (0 vulnerabilities). |
| DEAN | PASS | No dependencies were added; `npm audit --audit-level=moderate` returned 0 vulnerabilities. |
| SETH | PASS | Changed files contain no committed provider tokens/API keys; only `WATCH_TIER2_API_KEY` placeholder/env-name handling is present. |
| ARCH | PASS | New test file imports production watch/contract exports; architecture rule allows Test → Any imports. No production boundary changed. |
| IRIS | PASS | No TODO/FIXME/HACK/XXX/debug markers in changed files; no code-review concern found in the bounded change. |
| DOCS | PASS | Related runbook `docs/TIER2-SETUP.md` updated with the new live-proof command, so docs stayed current with the test addition. |
| ARIA/LUKE/DANA/GABE | SKIP | No UI, UX, data schema/migration, or application route/API files changed. |
| OMAR/PETE/REED/VERA/RUBY | PASS/SKIP | No production behavior changed; live test remains bounded/opt-in with an env-configured timeout, and Phase 12 diagnostics remain deferred. |

### Post-UNIFY reports

| Module | Result | Evidence / Side effect |
|--------|--------|------------------------|
| WALT | PASS | Appended `.paul/QUALITY-HISTORY.md` row for 11-01: stable quality, +1 skipped opt-in live test, typecheck/build/audit pass. |
| CODI | INFO | Appended `.paul/CODI-HISTORY.md` row for 11-01: no production symbol changed; pre-plan symbols `buildTier2Request`, `parseTier2Answer`, `createTier2Runner` were verified through the live proof. |
| RUBY | INFO | No code-debt action; production adapter was not modified, and the existing silent null-escalation debt remains intentionally deferred to Phase 12 diagnostics. |
| SKIP | INFO | Durable knowledge captured in this SUMMARY: live tier-2 model tests are opt-in/default-skipped and should use the production adapter path instead of a model-specific branch. |

## Accomplishments

- Added `test/watch/tier2.live.test.ts`, a live integration proof gated by `WATCH_TIER2_LIVE=1` and skipped by default.
- Proved the real local Qwen3-VL endpoint accepts the existing OpenAI-compatible `buildTier2Request` `content[]` shape and returns a parseable answer through `parseTier2Answer`.
- Updated `docs/TIER2-SETUP.md` with the exact opt-in command and reiterated that local `mlx_vlm.server` does not require `WATCH_TIER2_API_KEY`.
- Confirmed no model-specific production branch or tier-2 adapter fix was needed.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1 + Task 2: Add/run live tier-2 proof | `432b843` | test | Created default-skipped live Vitest proof and verified it against the local endpoint. |
| Task 3: Document live proof command | `c8538f1` | docs | Added the `WATCH_TIER2_LIVE=1` command, default-skip note, and local API-key guidance to the runbook. |

Plan metadata will be committed separately with this SUMMARY and lifecycle updates.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `test/watch/tier2.live.test.ts` | Created | Opt-in live proof using production `buildTier2Request` + `parseTier2Answer` against a real OpenAI-compatible endpoint. |
| `docs/TIER2-SETUP.md` | Modified | Documents how to run the live proof and why it is skipped by default. |
| `.paul/phases/11-tier2-live-proof/11-01-PLAN.md` | Created | Approved executable plan for Phase 11. |
| `.paul/phases/11-tier2-live-proof/11-01-SUMMARY.md` | Created | UNIFY reconciliation artifact. |
| `.paul/STATE.md` | Updated | Routed lifecycle from APPLY complete toward Phase 12 planning after UNIFY/merge. |
| `.paul/ROADMAP.md` | Updated | Marks Phase 11 complete and Phase 12 ready to plan. |
| `.paul/QUALITY-HISTORY.md` | Updated | Records WALT quality delta for 11-01. |
| `.paul/CODI-HISTORY.md` | Updated | Records CODI post-unify outcome for 11-01. |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Keep the live proof opt-in via `WATCH_TIER2_LIVE=1` | A local model server is machine-specific and unsuitable for default CI/offline runs. | Default `npm test` remains fast and CI-safe while developers can explicitly prove the live endpoint. |
| Do not change `src/watch/tier2.ts` | The running local Qwen3-VL endpoint accepted the current request shape and `parseTier2Answer` parsed the real response. | Confirms the model-agnostic adapter seam from v0.1/Phase 10 without adding code forks. |
| Leave diagnostics for Phase 12 | The only notable debt is the pre-existing null-escalation/silent failure behavior, not a Phase 11 wire-shape blocker. | Phase 12 can focus cleanly on visible failure diagnostics without mixing in the live proof. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | No production mismatch or code fix was needed. |
| Scope additions | 0 | Work stayed within the approved test/docs scope. |
| Deferred | 1 | Tier-2 failure diagnostics remain Phase 12 scope as planned. |

**Total impact:** Plan executed as intended; no scope creep.

### Auto-fixed Issues

None.

### Deferred Items

- Phase 12: Surface tier-2 failure diagnostics (unconfigured / bad status / parse-fail / timeout) instead of silent `null` escalation.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Initial live proof got `ECONNREFUSED` because the Phase 10 server was not running. | Restarted `mlx_vlm.server` with the documented process command, waited for `Model ready` / `Uvicorn running`, then re-ran the live proof successfully. |
| GitHub PR checks were not reported for PR #13 (`statusCheckRollup=[]`). | Recorded the absence; local verification passed. Merge gate will treat required checks according to GitHub branch protection / PR state. |

## Verification

| Command | Result |
|---------|--------|
| `npm test -- test/watch/tier2.live.test.ts` | PASS — 1 skipped file / 1 skipped test by default. |
| `WATCH_TIER2_LIVE=1 WATCH_TIER2_BASE_URL="http://localhost:8080/v1" WATCH_TIER2_MODEL="mlx-community/Qwen3-VL-8B-Instruct-4bit" npm test -- test/watch/tier2.live.test.ts` | PASS — live endpoint answered and parsed. |
| `npm test` | PASS — 11 passed files + 1 skipped file; 125 passed tests + 1 skipped test. |
| `npm run typecheck` | PASS. |
| `npm run build` | PASS. |
| `npm audit --audit-level=moderate` | PASS — 0 vulnerabilities. |

## Next Phase Readiness

**Ready:**
- The live wire-shape proof is reproducible and documented.
- The production tier-2 request/response adapter path has real endpoint evidence.
- Phase 12 can now focus on diagnostics/failure visibility rather than proving the basic wire shape.

**Concerns:**
- Live proof depends on a local background server and is intentionally not a default CI check.
- PR #13 currently has no reported status checks beyond local verification evidence.

**Blockers:**
- None for Phase 12 planning after merge/transition.

---
*Phase: 11-tier2-live-proof, Plan: 01*
*Completed: 2026-06-24*
