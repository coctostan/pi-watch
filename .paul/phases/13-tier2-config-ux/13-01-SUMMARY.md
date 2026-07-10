---
phase: 13-tier2-config-ux
plan: 01
subsystem: config-ux
tags: [tier2, config, watch, mlx-vlm, local-first, diagnostics, vitest]
requires:
  - phase: 12-tier2-failure-diagnostics
    provides: Tier2Diagnostic unconfigured reason and details.tier2 boundary collector
provides:
  - secret-free unconfigured guidance on single-video watch results
  - opt-in WATCH_TIER2_LOCAL localhost mlx_vlm configuration
  - pure withUnconfiguredHint content helper
  - first-run tier-2 configuration documentation and tests
affects:
  - tier-2 configuration
  - single-video watch result UX
  - docs/TIER2-SETUP.md
tech-stack:
  added: []
  patterns: [opt-in local default with explicit-env precedence, pure result-content decoration]
key-files:
  created: [test/watch/extension-unconfigured-hint.test.ts]
  modified: [src/watch/tier2.ts, src/watch/extension.ts, src/watch/index.ts, src/config/config.ts, test/watch/tier2.test.ts, test/config/config.test.ts, docs/TIER2-SETUP.md]
key-decisions:
  - "Checkpoint option-b: ship the guidance message plus an opt-in WATCH_TIER2_LOCAL=1 localhost default"
  - "Keep the default path network-free; explicit WATCH_TIER2_BASE_URL and WATCH_TIER2_MODEL win"
  - "Surface the hint only on single-video watch results when tier 2 was unconfigured and another tier answered"
patterns-established:
  - "Pattern: optional local defaults require explicit opt-in and never alter the network-free unconfigured default"
  - "Pattern: user-facing failure guidance is derived by a pure helper from final tier plus structured diagnostic"
duration: not recorded
started: 2026-06-24
completed: 2026-06-24
---

# Phase 13 Plan 01: Tier-2 Config UX Summary

**Tier 2 now gives unconfigured users an actionable, secret-free setup hint on single-video `watch` results, while `WATCH_TIER2_LOCAL=1` provides an opt-in localhost `mlx_vlm` default without changing the network-free default path.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | Not recorded |
| Started | 2026-06-24 |
| Completed | 2026-06-24 |
| Tasks | 2 implementation tasks completed + 1 checkpoint resolved |
| Product files changed | 8 (1 created, 7 modified) |

## Acceptance Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| AC-1: Unconfigured guidance is surfaced on single-video `watch` | PASS | `withUnconfiguredHint` appends `TIER2_UNCONFIGURED_HINT` only when `finalTier !== 2` and `diagnostic.reason === "unconfigured"`; boundary tests preserve the original answer first and append the hint last. |
| AC-2: No guidance noise for configured/success/non-unconfigured failures | PASS | Pure specs cover tier-2 success plus `http-error` and `network-error`; all return content without the hint. |
| AC-3: Default unconfigured path stays network-free | PASS | `resolveTier2ConfigFromEnv({})` remains `null`; the existing runner emits `unconfigured` before fetch. The full suite passes and `src/watch/tier-runner.ts` is untouched. |
| AC-4: Opt-in local default is explicit, precedence-safe, and secret-free | PASS | `WATCH_TIER2_LOCAL=1` resolves `http://localhost:8080/v1` + `mlx-community/Qwen3-VL-8B-Instruct-4bit`; explicit URL/model win; other flag values return `null`; no secret appears in the constants or hint. |
| AC-5: Docs and tests reflect the UX | PASS | `docs/TIER2-SETUP.md` documents the flag, precedence, network behavior, failure nuance, and hint; final verification: 152 passed / 1 skipped, build and typecheck clean. |

## Module Execution Reports

### Pre-UNIFY

`[dispatch] pre-unify: 0 modules registered for this hook` — no installed module registers `pre-unify`.

### APPLY carried-forward reports

| Module | Result | Evidence |
|--------|--------|----------|
| WALT / TODD | PASS | APPLY recorded 152 passed / 1 skipped and clean tsc; final UNIFY rerun confirms the same. New tests directly exercise the pure config and hint decisions. |
| SETH | PASS | Guidance and localhost constants contain only public configuration names/values; the hint test rejects `Bearer`, `sk-`, and api-key-like material. |
| ARCH / REED | PASS | Config resolution remains pure; content decoration is a pure boundary helper; `tier-runner.ts` and null-to-escalate semantics are unchanged. |
| DOCS | PASS | Tier-2 setup guidance, `WATCH_TIER2_LOCAL`, precedence, and failure behavior are documented in `docs/TIER2-SETUP.md`. |
| DEAN | PASS | No package or lockfile changes; final `npm audit --audit-level=moderate` reports 0 vulnerabilities. |
| IRIS / RUBY | PASS | No review markers or material debt were reported; the implementation uses named constants and a small pure helper. |
| UI/data/API/CI/privacy/performance modules | SKIP | No matching surfaces changed. |

### Post-UNIFY reports

| Module | Result | Evidence / Side effect |
|--------|--------|------------------------|
| WALT | PASS | Appended `.paul/QUALITY-HISTORY.md` for 13-01: 139→152 passing tests (+13), 1 live test skipped, build/typecheck clean, no lint runner configured. |
| SKIP | INFO | Durable knowledge retained in this SUMMARY: option-b's explicit opt-in, explicit-env precedence, network-free default, and single-watch-only hint boundary. No separate knowledge artifact was required. |
| CODI | INFO | Appended `.paul/CODI-HISTORY.md`; the PLAN contains advisory small/contained blast-radius prose but no canonical success/skip/degraded instrumentation marker, so the taxonomy outcome is `no-dispatch-found`. |
| RUBY | PASS | Changed source files are 106–368 lines; no >500-line god file or source-backed refactor candidate. The new decision logic is already isolated in pure `resolveTier2ConfigFromEnv` and `withUnconfiguredHint` helpers. |

`[dispatch] post-unify: WALT PASS; SKIP INFO; CODI INFO; RUBY PASS — no blockers`

## Accomplishments

- Added one shared `TIER2_UNCONFIGURED_HINT` and a pure, immutable `withUnconfiguredHint` helper.
- Wired the hint only into single-video `watch`; `watch_batch` retains structured per-item `details.tier2` without aggregate-content noise.
- Added opt-in `WATCH_TIER2_LOCAL=1` resolution to the documented localhost Qwen3-VL endpoint while preserving explicit env precedence and the network-free default.
- Added 13 deterministic tests and expanded the tier-2 setup runbook.
- Preserved the model-agnostic adapter, Phase-12 diagnostic shape, and `null === escalate` contract.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: Config UX checkpoint | — | decision | Selected option-b: guidance message + opt-in localhost default. |
| Task 2: Implement config UX | `4934054` | feat | Added guidance constant/helper/wiring and opt-in local config resolution; archived the consumed apply-ready handoff. |
| Task 3: Tests and docs | `1e1647a` | test/docs | Added pure hint/config specs, docs, and barrel exports needed by tests/consumers. |

Plan metadata will be committed with this SUMMARY and lifecycle updates.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/watch/tier2.ts` | Modified | Shared hint and localhost constants; opt-in config resolution with explicit-env precedence. |
| `src/config/config.ts` | Modified | Documented delegated opt-in local-default resolution. |
| `src/watch/extension.ts` | Modified | Pure `withUnconfiguredHint` helper and single-video watch wiring. |
| `src/watch/index.ts` | Modified | Re-exported the new public constants for focused tests and package consumers. |
| `test/watch/extension-unconfigured-hint.test.ts` | Created | Pure boundary coverage for append/suppress/no-secret/immutability behavior. |
| `test/watch/tier2.test.ts` | Modified | Local-default, default-null, precedence, and flag-value coverage. |
| `test/config/config.test.ts` | Modified | Proved `WATCH_TIER2_LOCAL` composition and override precedence. |
| `docs/TIER2-SETUP.md` | Modified | Documented zero-config opt-in, precedence, network behavior, and the human-facing hint. |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Select option-b: message + opt-in local default | Best completes the v0.2 local-first on-ramp while preserving the firm network-free-default constraint. | Users can set one flag for the documented local server; users who do nothing still make no tier-2 request. |
| Explicit URL/model override the local default | Existing explicit configuration must remain authoritative and model/backend swappability must not regress. | The localhost pair is convenience only, not a backend-specific code fork. |
| Hint only the single-video `watch` content | Batch already carries per-item structured diagnostics and aggregate hinting would add noisy, ambiguous text. | `watch_batch` behavior remains unchanged. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | — |
| Scope additions | 1 | `src/watch/index.ts` re-exports the new constants so tests and package consumers can use the shared source of truth; no behavioral expansion. |
| Deferred | 0 | — |

**Total impact:** The plan was executed as approved under option-b. The only unlisted product-file change was the small barrel export; it stayed within the watch module and introduced no new behavior or dependency.

### Auto-fixed Issues

None.

### Deferred Items

None from this plan. Existing future considerations (tier-3 batch fan-out, richer config surfaces, optional cloud backend, dedicated CI/live runtime smoke) remain outside Phase 13.

## Issues Encountered

None. APPLY and final UNIFY verification completed without regressions.

## Verification

| Command / check | Result |
|-----------------|--------|
| `npm test` | PASS — 13 test files passed, 1 skipped; 152 tests passed, 1 live test skipped. |
| `npm run build` | PASS. |
| `npm run typecheck` | PASS. |
| `npm audit --audit-level=moderate` | PASS — 0 vulnerabilities. |
| Protected-file comparison | PASS — `src/watch/tier-runner.ts` unchanged from `main`. |
| Dependency comparison | PASS — `package.json` and lockfile unchanged from `main`. |
| Secret review | PASS — hint/local constants contain no api key, Authorization header, or interpolated env value. |

## Next Phase Readiness

**Ready:**
- All four v0.2 phases are implemented and reconciled.
- Tier 2 has a documented local endpoint, a live wire-shape proof, structured failure diagnostics, and actionable first-run config UX.
- PR #15 can pass the GitHub Flow merge gate and close the v0.2 milestone.

**Concerns:**
- Dedicated CI beyond Socket checks and a live pi runtime smoke remain future milestone candidates.

**Blockers:**
- None.

---
*Phase: 13-tier2-config-ux, Plan: 01*
*Completed: 2026-06-24*
