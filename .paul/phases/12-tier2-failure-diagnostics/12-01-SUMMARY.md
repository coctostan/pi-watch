---
phase: 12-tier2-failure-diagnostics
plan: 01
subsystem: api
tags: [tier2, diagnostics, observability, watch, watch_batch, walk-tier-chain, openai-compatible, vitest]
requires:
  - phase: 06-tier-adapters
    provides: createTier2Runner / buildTier2Request / parseTier2Answer tier-2 adapter path
  - phase: 11-tier2-live-proof
    provides: confirmation the production tier-2 wire shape works; deferred the silent-null diagnostics to Phase 12
provides:
  - structured Tier2Diagnostic type (unconfigured / http-error / empty-answer / timeout / network-error)
  - createTier2Runner onDiagnostic side-channel callback (option-a boundary collector)
  - details.tier2 failure surface on watch + watch_batch tool results
  - docs/TIER2-SETUP.md "Reading tier-2 failures" runbook section
affects:
  - Phase 13: Tier-2 config UX (can build the "tier 2 unconfigured — set X" UX over the unconfigured reason)
  - docs/TIER2-SETUP.md
tech-stack:
  added: []
  patterns: [onDiagnostic boundary collector, pure diagnostic-merge helper at the effect boundary]
key-files:
  created: [test/watch/tier2-diagnostics.boundary.test.ts]
  modified: [src/watch/tier2.ts, src/watch/extension.ts, src/watch/index.ts, test/watch/tier2.test.ts, docs/TIER2-SETUP.md]
key-decisions:
  - "Decision (checkpoint): option-a — onDiagnostic boundary collector; tier-runner.ts + its tests stay byte-for-byte unchanged"
  - "Decision: build a fresh tier-2 runner + collector per call / per batch item for clean per-item attribution"
patterns-established:
  - "Pattern: tier-2 failure reasons flow out via an optional onDiagnostic side channel, not by widening the null === escalate walk contract"
  - "Pattern: details.tier2 is recorded only when the final tier !== 2; a successful tier-2 answer records no failure diagnostic"
  - "Pattern: diagnostics are secret-free — never the api key, Authorization header, or request body"
duration: ~12min
started: 2026-06-24T15:10:00-04:00
completed: 2026-06-24T15:22:00-04:00
---

# Phase 12 Plan 01: Tier-2 Failure Diagnostics Summary

**The single silent `null` that `createTier2Runner` returned for every tier-2 failure is now a structured, secret-free `Tier2Diagnostic` (unconfigured / http-error+status / empty-answer / timeout / network-error) surfaced as `details.tier2` on `watch` and `watch_batch` — with the null→tier-3 escalation contract and the model-agnostic adapter left byte-for-byte intact (option-a boundary collector).**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~12min APPLY execution |
| Started | 2026-06-24T15:10:00-04:00 |
| Completed | 2026-06-24T15:22:00-04:00 |
| Tasks | 3 completed + 1 checkpoint:decision resolved |
| Files modified | 6 changed files (5 modified, 1 created) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Each tier-2 failure mode produces a distinct, safe diagnostic | PASS | `test/watch/tier2.test.ts` asserts one diagnostic per reason — unconfigured (with `calls.length === 0`), http-error (`httpStatus: 500`), empty-answer, timeout (abort), network-error (with short message); a no-leak test proves no api key / `Authorization` appears in the serialized diagnostic. |
| AC-2: Escalation to tier 3 is byte-for-byte preserved | PASS | Existing `toBeNull()` anchors kept; new tests show the runner still returns `null` on every failure and `walkTierChain` still resolves at tier 3 while a diagnostic is emitted; a throwing `onDiagnostic` still resolves to `null`. `tier-runner.ts` + `tier-runner.test.ts` unchanged. |
| AC-3: The diagnostic reaches the tool-result details | PASS | `test/watch/tier2-diagnostics.boundary.test.ts` proves `details.tier2` is recorded when tier 2 fails and tier 3 answers (reason + status), preserves the existing `details` fields, and is absent when tier 2 answers. |
| AC-4: The success path and wire shape are unchanged | PASS | Success returns the same tier-2 `TierResult` with no diagnostic; `buildTier2Request`/`parseTier2Answer` untouched and model-agnostic; full `npm test` (139 pass / 1 skipped), `npm run typecheck`, `npm run build` all pass. |

## Module Execution Reports

### Pre-UNIFY

`[dispatch] pre-unify: 0 modules registered for this hook` — no module registers the `pre-unify` hook in the installed registry.

### APPLY carried-forward reports

| Module | Result | Evidence |
|--------|--------|----------|
| DEAN | PASS | Pre-apply and post-apply `npm audit --audit-level=moderate` returned 0 vulnerabilities; no new dependency added (diagnostics use only existing TS + Node ≥20 `AbortSignal`/`DOMException`). |
| TODD | PASS | Existing deterministic injected-fetch `toBeNull()` escalation anchors preserved; per-reason + success-no-diagnostic + no-leak + throwing-collector specs added; Phase 11 opt-in live test still skipped by default. |
| WALT | PASS | Post-apply gates: `npm test` 139 passed / 1 skipped, `npm run typecheck`, `npm run build`, `npm audit` all clean. |
| CODI | INFO | `impact(createTier2Runner, signature_change)` flagged `extension.ts` as the only depth-1 dependent; option-a kept the blast radius at that boundary. Seeds: `createTier2Runner`, `walkTierChain`, `parseTier2Answer`. |
| RUBY | PASS | The scheduled paydown of the intentional silent-null debt (`catch { return null }`, `!res.ok -> null`, `config===null -> null`) was resolved as a structured diagnostic without changing tier selection, escalation policy, or `null === escalate` semantics. |
| SETH | PASS | Diagnostics carry only `reason`, numeric `httpStatus`, and a short `message`; tests assert no api key / `Authorization` / request body leaks. |
| IRIS | PASS | No TODO/FIXME/HACK/XXX markers introduced; defensive non-throwing style preserved (best-effort `emit`, swallowed collector errors). |
| ARCH | PASS | Pure builders stay pure; the mutable collector + `withTier2Diagnostic` merge live only at the effect boundary; the `null === escalate` walk core is unchanged. |
| DOCS | PASS | `docs/TIER2-SETUP.md` extended with the `details.tier2` surface so the runbook does not drift. |
| DAVE | PASS | No deploy surface changed; the unconfigured path remains network-free; no required CI dependency added. |
| ARIA/LUKE/DANA/VERA/GABE/OMAR/PETE/REED | SKIP/PASS | No UI, UX, data schema/migration, PII, route/API-gateway, or production-perf surface changed; diagnostics carry no user/personal data. |

### Post-UNIFY reports

| Module | Result | Evidence / Side effect |
|--------|--------|------------------------|
| WALT | PASS | Appended `.paul/QUALITY-HISTORY.md` row for 12-01: ▲ improved (+14 tests, 125→139 pass), typecheck/build/audit clean, no new deps. |
| CODI | INFO | Appended `.paul/CODI-HISTORY.md` row for 12-01: outcome `injected-degraded` reasoning recorded; `createTier2Runner` extended additively (optional `onDiagnostic`); blast radius held at the `extension.ts` boundary per pre-plan `impact`. |
| RUBY | INFO | No new code debt; the targeted silent-null debt was paid down behavior-preservingly. The per-call runner construction replaces the prior "build runners once" pattern cleanly. |
| SKIP | INFO | Durable knowledge captured in this SUMMARY: surface tier-walk failure reasons via an optional `onDiagnostic` side channel rather than widening the `null === escalate` walk contract; record `details.tier2` only on `finalTier !== 2`; keep diagnostics secret-free. |

## Accomplishments

- Added a discriminated `Tier2Diagnostic` / `Tier2FailureReason` type to `src/watch/tier2.ts` and emit one diagnostic before each of the five `return null` sites in `createTier2Runner`.
- Wired the diagnostic to `watch` + `watch_batch` `details.tier2` via an option-a boundary collector: a fresh tier-2 runner + collector per call / per batch item, merged by the pure `withTier2Diagnostic` helper.
- Preserved the load-bearing invariant: `tier-runner.ts` and `tier-runner.test.ts` are byte-for-byte unchanged; `null === escalate` and the total tier-3 terminal are untouched.
- Documented the `details.tier2` failure surface (five reasons, tier-3 degradation note, Troubleshooting mapping, no-secrets statement) in `docs/TIER2-SETUP.md`.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: Emit a structured Tier2Diagnostic per failure mode | `540bfed` | feat | Added `Tier2Diagnostic`/`Tier2FailureReason`, `onDiagnostic` side channel, index exports, per-reason + no-leak tests. |
| Task 2: Plumb the diagnostic to the tool-result details | `5f14bed` | feat | Fresh per-call/per-item collector + tier-2 runner; pure `withTier2Diagnostic` merge; `batchTier3Runner` extracted; boundary test. |
| Task 3: Document the tier-2 failure / details surface | `99192a5` | docs | "Reading tier-2 failures" runbook section mapping each reason to a cause/fix. |

Plan metadata will be committed separately with this SUMMARY and lifecycle updates.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/watch/tier2.ts` | Modified | Added `Tier2Diagnostic`/`Tier2FailureReason`, `shortErrorMessage`, and an `onDiagnostic` side channel emitting one diagnostic per failure mode. |
| `src/watch/extension.ts` | Modified | Fresh per-call/per-item tier-2 runner + collector; pure `withTier2Diagnostic` merge into `details`; extracted `batchTier3Runner`. |
| `src/watch/index.ts` | Modified | Exported `Tier2Diagnostic` and `Tier2FailureReason`. |
| `test/watch/tier2.test.ts` | Modified | Added per-reason, success-no-diagnostic, no-leak, walk-still-escalates, and throwing-collector specs. |
| `test/watch/tier2-diagnostics.boundary.test.ts` | Created | Boundary spec proving the diagnostic reaches `details` on tier-3 escalation and is absent on tier-2 success. |
| `docs/TIER2-SETUP.md` | Modified | Added the "Reading tier-2 failures" `details.tier2` runbook section. |
| `.paul/phases/12-tier2-failure-diagnostics/12-01-PLAN.md` | Created | Approved executable plan for Phase 12. |
| `.paul/phases/12-tier2-failure-diagnostics/12-01-SUMMARY.md` | Created | This UNIFY reconciliation artifact. |
| `.paul/STATE.md` | Updated | Routed lifecycle through APPLY → UNIFY for 12-01. |
| `.paul/ROADMAP.md` | Updated | Marks Phase 12 status. |
| `.paul/QUALITY-HISTORY.md` | Updated | WALT quality delta for 12-01. |
| `.paul/CODI-HISTORY.md` | Updated | CODI post-unify outcome for 12-01. |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Checkpoint → option-a (onDiagnostic boundary collector) | `impact` flagged `extension.ts` as the only depth-1 dependent; option-a keeps the `null === escalate` walk contract and its tests byte-for-byte unchanged; the diagnostic is genuinely a boundary/observability concern, and option-b's generality (uniform diagnostics for any tier) isn't used yet since tiers 1/3 don't fail interestingly. | Smallest blast radius; the load-bearing escalation invariant is provably untouched. |
| Build a fresh tier-2 runner + collector per call / per batch item | `createTier2Runner` only closes over config (no pool/warmup), so per-call construction is free and gives correct per-item attribution where one runner instance previously served N parallel `watch_batch` items. | Clean per-call/per-item `details.tier2`; replaces the prior "build runners once" pattern. |
| Record `details.tier2` only when `finalTier !== 2` | A successful tier-2 answer is not a failure; surfacing a diagnostic then would be misleading. | `details.tier2` is present exactly when an operator needs to know why tier 2 was skipped. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | — |
| Scope additions | 1 | New test file `tier2-diagnostics.boundary.test.ts` (justified by Task 2's "boundary test" verify; the extension's `execute` closures are not exported, so a focused composition test is the faithful way to prove AC-3). |
| Deferred | 0 | Phase 13 config UX was already out of scope. |

**Total impact:** Plan executed as written under option-a; no scope creep. The PLAN listed `src/watch/tier-runner.ts` and `test/watch/tier-runner.test.ts` in `files_modified` only because option-b would have touched them — under the selected option-a they were correctly left unchanged (PLAN boundary: "Under option-a, do NOT modify `src/watch/tier-runner.ts` or its test").

### Auto-fixed Issues

None.

### Deferred Items

None — Phase 13 (Tier-2 config UX: auto-point at localhost, user-facing "tier 2 unconfigured" prompt) was already scoped out of this plan and remains the next phase.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| None | APPLY ran cleanly; all tasks PASS on first verification. |

## Verification

| Command | Result |
|---------|--------|
| `npm test -- test/watch/tier2.test.ts` | PASS — 28 passed (19 existing + 9 new diagnostic specs). |
| `npm test` | PASS — 12 passed files + 1 skipped; 139 passed tests + 1 skipped (Phase 11 live test). |
| `npm run typecheck` | PASS. |
| `npm run build` | PASS. |
| `npm audit --audit-level=moderate` | PASS — 0 vulnerabilities. |
| `git diff --quiet src/watch/tier-runner.ts test/watch/tier-runner.test.ts` | PASS — option-a boundary respected (unchanged). |

## Next Phase Readiness

**Ready:**
- Tier-2 failures are now diagnosable; `details.tier2` gives operators a reason (+ status/message) and the runbook maps each reason to a fix.
- The `unconfigured` reason is the natural hook for Phase 13's "tier 2 unconfigured — set X to enable it" config UX.
- The model-agnostic adapter and null→tier-3 escalation contract are provably unchanged.

**Concerns:**
- The bounded `watch_batch` aggregate *text* output was intentionally not changed (only per-item `details.tier2`); a future phase may choose to surface failure reasons in the aggregate text if operators want them inline.

**Blockers:**
- None for Phase 13 planning after merge/transition.

---
*Phase: 12-tier2-failure-diagnostics, Plan: 01*
*Completed: 2026-06-24*
