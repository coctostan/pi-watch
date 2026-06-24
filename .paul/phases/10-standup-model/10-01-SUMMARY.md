---
phase: 10-standup-model
plan: 01
subsystem: ops
tags: [tier-2, mlx-vlm, qwen3-vl, openai-compatible, local-model]
requires:
  - phase: 06-tier-adapters
    provides: tier-2 OpenAI-compatible request/response adapter
  - phase: 07-config-surface
    provides: WATCH_TIER2_* config wiring
provides:
  - local mlx_vlm.server endpoint running Qwen3-VL 8B 4-bit
  - reproducible tier-2 setup runbook
  - verified WATCH_TIER2_BASE_URL and WATCH_TIER2_MODEL values
affects:
  - Phase 11: Tier-2 live wire-shape proof
  - Phase 12: Tier-2 failure diagnostics
tech-stack:
  added: [mlx-vlm 0.6.3 local Python environment]
  patterns: [OpenAI-compatible local vision endpoint, uv-pinned Python environment]
key-files:
  created: [docs/TIER2-SETUP.md]
  modified: []
key-decisions:
  - "Decision: start with mlx-community/Qwen3-VL-8B-Instruct-4bit for fastest local green path"
patterns-established:
  - "Tier 2 local model setup is ops/config only: baseURL + model id, no model-specific TypeScript fork"
duration: ~20min
started: 2026-06-24T09:10:00-07:00
completed: 2026-06-24T09:30:00-07:00
---

# Phase 10 Plan 01: Stand up the model Summary

**Local Qwen3-VL tier 2 is now running through `mlx_vlm.server`, smoke-tested with the same OpenAI-compatible `image_url` chat-completions shape used by pi-watch, and documented in `docs/TIER2-SETUP.md`.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~20 minutes |
| Started | 2026-06-24T09:10:00-07:00 |
| Completed | 2026-06-24T09:30:00-07:00 |
| Tasks | 2 auto tasks + 2 checkpoints completed |
| Files modified | 1 repo doc created |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Pinned Python environment with `mlx_vlm` importable | PASS | `uv venv --python 3.12 /Users/maxwellnewman/pi/workspace/pi-watch-mlx-venv`; `mlx_vlm.__version__` printed `0.6.3`. |
| AC-2: Local server answers a frames-as-images chat request | PASS | `mlx_vlm.server` running on port 8080; smoke POST to `http://localhost:8080/v1/chat/completions` returned `HTTP 200` and `CONTENT red`. |
| AC-3: Reproducible runbook committed | PASS | `docs/TIER2-SETUP.md` documents prerequisites, env setup, server start, model id, base URL, smoke test, troubleshooting, and `WATCH_TIER2_*` exports. |

## Module Execution Reports

### Pre-UNIFY

`[dispatch] pre-unify: 0 modules registered for this hook`.

### APPLY carried-forward reports

| Module | Result | Evidence |
|--------|--------|----------|
| TODD | SKIP | Plan type was `execute`; no RED/test-first work and no pure-logic TS implementation task. |
| WALT | PASS | Baseline `npm test`: 11 files passed, 125 tests passed. Post-apply `npm test`, `npm run typecheck`, and `npm run build` passed. |
| DEAN | PASS | `npm audit --audit-level=moderate` found 0 vulnerabilities; no npm dependency was added. |
| SETH | PASS | Runbook contains localhost/config placeholders only; grep found no `sk-*`, `hf_*`, bearer token, or real API key pattern. |
| DOCS | PASS | Scope was documentation-only; new `docs/TIER2-SETUP.md` is the intended artifact. |
| ARCH/ARIA/DANA/GABE/IRIS/LUKE/OMAR/PETE/REED/VERA | SKIP | No source, UI, data, API, or privacy-sensitive code files changed. |
| SKIP | INFO | Knowledge candidate: the 8B 4-bit Qwen3-VL checkpoint was chosen first because it is ~5.38 GiB versus ~17.01 GiB for 30B-A3B and is the fastest low-risk local default. |

### Post-UNIFY reports

| Module | Result | Evidence / Side effect |
|--------|--------|------------------------|
| WALT | PASS | Quality remained stable: tests 125→125 pass, typecheck pass→pass, build pass; appended Phase 10 row to `.paul/QUALITY-HISTORY.md`. |
| CODI | SKIP | Documentation-only scope; no source symbols or blast-radius entries. Appended `10-01` row to `.paul/CODI-HISTORY.md` as `skipped-no-symbols`. |
| SKIP | INFO | Captured the Qwen3-VL 8B default decision in this SUMMARY; no separate knowledge store update was required. |
| RUBY | NOT_APPLICABLE | Docs-only runbook; no readable source file changed and no refactor candidate applies. |

## Quality

| Metric | Before | After | Delta | Trajectory |
|--------|--------|-------|-------|------------|
| Tests passing | 125 | 125 | 0 | ● stable |
| Tests failing | 0 | 0 | 0 | ● stable |
| Typecheck | pass | pass | 0 | ● stable |
| Build | pass | pass | 0 | ● stable |
| NPM audit | 0 vulnerabilities | 0 vulnerabilities | 0 | ● stable |
| Lint | — | — | — | — skipped |

**Overall:** ● stable

## Accomplishments

- Chose and verified the initial local tier-2 default: `mlx-community/Qwen3-VL-8B-Instruct-4bit`.
- Created a uv-pinned Python 3.12 environment outside the repo and installed `mlx-vlm==0.6.3` without touching system Python 3.14.6.
- Started `mlx_vlm.server` on port 8080 and left it running for Phase 11.
- Proved the real endpoint accepts the OpenAI-compatible image-url chat-completions wire shape and returns a parseable answer.
- Added `docs/TIER2-SETUP.md` with exact commands, model id, endpoint URL, smoke test, and `WATCH_TIER2_*` exports.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1 + Task 2 | `fc56c21` | docs | Documented local tier-2 model setup, after provisioning env/server and verifying smoke response. |

Plan metadata will be committed separately with this SUMMARY and lifecycle updates.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `docs/TIER2-SETUP.md` | Created | Reproducible runbook for local tier-2 model setup and smoke testing. |
| `.paul/phases/10-standup-model/10-01-SUMMARY.md` | Created | UNIFY reconciliation artifact for Phase 10. |
| `.paul/STATE.md` | Updated | Routed lifecycle from APPLY complete to Phase 11 planning after Phase 10 completion. |
| `.paul/ROADMAP.md` | Updated | Marked Phase 10 complete and updated v0.2 progress. |
| `.paul/PROJECT.md` | Updated | Recorded Phase 10 in current state and key decisions. |
| `.paul/QUALITY-HISTORY.md` | Updated | Appended Phase 10 quality snapshot. |
| `.paul/CODI-HISTORY.md` | Updated | Appended documentation-only CODI skip row. |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Start with `mlx-community/Qwen3-VL-8B-Instruct-4bit` | It is the spike-proven small/fast baseline, verified reachable, and downloads ~5.38 GiB versus ~17.01 GiB for the 30B-A3B option. | Phase 11 has a low-risk local endpoint ready for live wire-shape proof; model id is not locked in and can be swapped later by config. |
| Place the Python environment outside the repo | Avoids committing virtualenvs or large artifacts and keeps repo scope docs-only. | Future operators can recreate the env using the runbook; repo stays clean. |
| Leave `mlx_vlm.server` running after APPLY | Phase 11 needs a live endpoint for the next wire-shape proof. | Next phase can begin without reloading the model unless the process exits. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | None |
| Scope additions | 0 | None |
| Deferred | 0 | None |

**Total impact:** Plan executed as written.

### Auto-fixed Issues

None.

### Deferred Items

None from this phase.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| User asked for model size comparison before choosing. | Verified both Hugging Face repos and weight sizes: 8B ≈5.38 GiB, 30B-A3B ≈17.01 GiB; user selected the smaller model. |
| `git status` command summaries were intermittently stale in the harness. | Used targeted git/file commands and direct file reads for reconciliation; no repository scope issue found. |

## Next Phase Readiness

**Ready:**
- `mlx_vlm.server` is running on `http://localhost:8080`.
- `WATCH_TIER2_BASE_URL="http://localhost:8080/v1"` and `WATCH_TIER2_MODEL="mlx-community/Qwen3-VL-8B-Instruct-4bit"` are documented.
- Phase 11 can run an opt-in live test against the actual `buildTier2Request` / `parseTier2Answer` path.

**Concerns:**
- There are no CI checks reported on PR #12; local test/typecheck/build/audit passed.
- The server is a local background process; if it exits before Phase 11, restart it with the command in `docs/TIER2-SETUP.md`.

**Blockers:**
- None.

---
*Phase: 10-standup-model, Plan: 01*
*Completed: 2026-06-24*
