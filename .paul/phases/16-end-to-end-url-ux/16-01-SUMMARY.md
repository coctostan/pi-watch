---
phase: 16-end-to-end-url-ux
plan: 01
subsystem: watch-ux
tags: [youtube, watch, extension, vitest, documentation, distribution]

requires:
  - phase: 14-youtube-source-resolution
    provides: supported YouTube canonicalization, owned media resolution, and caller-ref preservation
  - phase: 15-caption-transcript-pipeline
    provides: caption-backed transcript sampling with visual fallback
provides:
  - deterministic registered-tool and command coverage for pasted YouTube URLs
  - bounded default-off real-YouTube smoke coverage through the production watch path
  - committed Pi-loadable dist output for Git installs that omit dev dependencies
  - installation, URL-scope, fallback, cleanup, and troubleshooting documentation
affects:
  - release-v0.3
  - watch-tool
  - package-installation

tech-stack:
  added: []
  patterns:
    - characterize registered Pi boundaries with deterministic effect substitution
    - keep external-service smoke tests opt-in and timeout-bounded

key-files:
  created:
    - test/watch/extension.test.ts
    - test/watch/youtube.live.test.ts
    - README.md
    - docs/YOUTUBE-SETUP.md
    - dist/watch/extension.js
  modified: []

key-decisions:
  - "Commit exact npm run build output under dist/** because Pi-equivalent Git installs omit dev-only build tooling."
  - "Use Git/local-path Pi installation and explicitly reject the unrelated npm:pi-watch registry package."
  - "Accept the external audit-feed 0/3/2 to 0/4/2 delta because Phase 16 changed no dependency manifest or lockfile and introduced zero critical findings."

patterns-established:
  - "Real YouTube smoke coverage remains default-off, finite-timeout, public-URL-only, and secret-free."
  - "Git-package release documentation must distinguish commands available now from commands that require a future release tag."

duration: not-recorded
started: 2026-08-08
completed: 2026-08-09
---

# Phase 16 Plan 01: End-to-End URL UX Summary

**Pasted supported YouTube URLs are now proven through the actual registered `watch` tool and `/watch` command, backed by an opt-in live smoke, Pi-loadable committed build output, and complete installation/troubleshooting documentation.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | Not retained across the autonomous session boundary |
| Started | 2026-08-08 |
| Completed | 2026-08-09 |
| Tasks | 3 completed; Tasks 1–2 PASS, Task 3 PASS_WITH_CONCERNS |
| Files changed | 76 implementation artifacts: 2 tests, 2 docs, and 72 generated `dist/**` files |

## Acceptance Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| AC-1: Pasted YouTube URL reaches actual tool and command boundaries | PASS | `test/watch/extension.test.ts` captures the real extension registrations and verifies caption-backed tier 1, offline tier 3, original URL preservation, and one `/watch` steering message. Focused Task-1 verification recorded 17 passing tests. |
| AC-2: URL failures remain legible and safe | PASS | The registered tool converts a representative resolver rejection into `isError: true` with `details.error`, `details.ref`, and actionable text rather than throwing. |
| AC-3: Real YouTube smoke is opt-in and bounded | PASS | `test/watch/youtube.live.test.ts` is skipped unless `WATCH_YOUTUBE_LIVE=1`, uses a finite timeout and one-frame budget, and exercises the production registered-tool path. APPLY recorded one mandatory passing live run using public override `https://www.youtube.com/watch?v=jNQXAC9IVRw` after the default fixture was unavailable. |
| AC-4: Users can install and troubleshoot pasted-URL support | PASS | `README.md` and `docs/YOUTUBE-SETUP.md` cover prerequisites, three supported URL forms, Git/local Pi installation, the unrelated `npm:pi-watch` collision, tool/command usage, caption-to-visual fallback, owned cleanup, live-smoke commands, optional tier 2, troubleshooting, and deferred scope. A Pi-equivalent clean install retained and imported `dist/watch/extension.js`. |

## Module Execution Reports

[dispatch] pre-unify: 0 modules registered for this hook.

### WALT — APPLY Quality Evidence

| Metric | Before | After | Delta | Trajectory |
|--------|--------|-------|-------|------------|
| Tests passing | 189 | 194 | +5 | ▲ improved |
| Tests failing | 0 | 0 | 0 | ● stable |
| Tests skipped | 1 | 2 | +1 opt-in smoke | ● expected |
| Typecheck | pass | pass | stable | ● stable |
| Build | pass | pass | stable | ● stable |
| Lint/format | — | — | not configured | — skipped |

Final UNIFY confirmation: `npm test` passed 194 tests with 2 default-skipped opt-in tests; `npm run typecheck` and `npm run build` passed; a fresh build left committed `dist/**` unchanged.

### DEAN — Dependency Audit

Task 3 retained the user-approved `PASS_WITH_CONCERNS` result. `npm audit --json` changed from pre-plan 0 critical / 3 high / 2 moderate to 0 critical / 4 high / 2 moderate because the external advisory feed added `nanoid` findings in the unchanged dev dependency tree. Phase 16 changed neither `package.json` nor `package-lock.json`; the user explicitly approved closure with dependency maintenance tracked outside this release-UX scope.

### Scope and Safety Reconciliation

`git diff origin/main...HEAD -- package.json package-lock.json src .github` was empty before the implementation PR merged. No production source, manifest, lockfile, dependency, script, or CI configuration changed. The sole generated-artifact exception is the approved exact `npm run build` output under `dist/**`; `.codegraph/` remained pre-existing and untouched.

### Post-Unify Modules

[dispatch] post-unify: WALT(p100), SKIP(p200), CODI(p220), RUBY(p300) completed; no blocking action returned.

- **WALT (p100) — PASS:** Appended `16-01` to `.paul/QUALITY-HISTORY.md` from APPLY-captured evidence: tests 189→194 (+5), failures stayed 0, one additional default-skipped live smoke, typecheck/build pass, overall ▲ improved. The UNIFY-local rerun required by project policy confirmed the same 194-pass result but was not used to invent or replace APPLY metrics.
- **SKIP (p200) — NOTE:** Returned one complete source-backed lesson for durable reporting in this SUMMARY: **Pi Git installs that omit dev dependencies require committed distributable output when the manifest points into `dist/**`**. Source: this SUMMARY, `Decisions Made` and `Approved Scope Revision`; phase/plan 16-01; context: prepare-only clean installs lacked TypeScript tooling; content: commit exact build output without adding hooks/dependencies; impact: Git installs can load the extension while manifest and lockfile remain unchanged. No separate `.paul/knowledge/` store existed, so no additional side-effect file was invented.
- **CODI (p220) — PASS:** Appended `16-01` to `.paul/CODI-HISTORY.md` as `injected`: the PLAN contains canonical pre-plan evidence for 1 resolved symbol with call sites, 0 unresolved symbols, 1 total call site, and Blast Radius headings `watchExtension`, `runWatchCommand`, `sample`.
- **RUBY (p300) — PASS:** No technical-debt concern in the two changed authored TypeScript test files (`extension.test.ts`, 236 lines; `youtube.live.test.ts`, 105 lines). Generated `dist/**` is build output and the documentation-only files are not applicable to code-debt review; no source refactor is warranted.

## Accomplishments

- Added deterministic coverage around the real extension registration boundary without changing production seams.
- Added a default-safe live smoke that proves a public YouTube URL through source resolution, sampling, routing, and tier execution.
- Committed the exact distributable needed by Pi Git installs that omit dev dependencies.
- Published accurate Git/local installation, supported URL scope, fallback/cleanup, smoke-test, and troubleshooting guidance.
- Preserved all production source, manifest, dependency, lockfile, and CI boundaries.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: Characterize extension registrations offline | `bbf2358` | test | Caption-backed tier 1, offline tier 3, structured resolver errors, and `/watch` steering through the real registrations. |
| Task 2: Add and exercise the live YouTube smoke | `b0c898f` | test | Default-off bounded public-YouTube proof through the production registered `watch` path. |
| Task 3: Publish setup UX and distributable | `3ba66cb` | docs | README, YouTube runbook, and exact committed `dist/**` build output. |

Plan metadata completion is recorded by UNIFY after this summary is finalized.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `test/watch/extension.test.ts` | Created | Deterministic real-registration coverage for tool, command, tier fallback, and resolver errors. |
| `test/watch/youtube.live.test.ts` | Created | Opt-in timeout-bounded real YouTube smoke through the registered tool. |
| `README.md` | Created | Project overview, prerequisites, installation, usage, architecture summary, development, and scope. |
| `docs/YOUTUBE-SETUP.md` | Created | Exact URL support, operational flow, live verification, fallback/cleanup, and troubleshooting runbook. |
| `dist/**` | Created and force-staged | Exact `npm run build` output required by Pi Git-package installation without dev tooling. |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Commit exact `dist/**` output instead of adding `prepare` | Two Pi-equivalent clean installs showed that `npm install --omit=dev` cannot run the dev-only TypeScript build toolchain | Git installs can load the manifest-referenced extension while `package.json`, the lockfile, scripts, and dependencies stay unchanged. |
| Document Git/local-path sources and reject `npm:pi-watch` | The unscoped registry name belongs to an unrelated package | Users are routed to the correct repository without an unapproved package rename or publication. |
| Accept the audit-feed high-severity count increase | The new advisories appeared in an unchanged dev tree, no dependency artifact changed, and critical remained zero | Phase 16 closes with a documented concern; dependency maintenance remains separate work rather than release-UX scope creep. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Approved scope revision | 1 | Replaced the superseded prepare-only approach with committed exact build output. |
| External fixture substitution | 1 | Used an explicit supported public URL after the default yt-dlp fixture was unavailable. |
| Approved quality concern | 1 | Accepted external audit-feed drift with no dependency changes and zero critical findings. |
| GitHub Flow ordering deviation | 1 | PR #18 was merged after checks passed but before UNIFY metadata was finalized; lifecycle artifacts require a follow-up GitHub Flow merge. |

**Total impact:** Product behavior and boundaries stayed within the approved phase objective. The installation revision was necessary to satisfy AC-4, the live URL substitution followed the PLAN fallback, and the audit concern is explicitly preserved.

### Approved Scope Revision

The original prepare-only installation idea was superseded after Pi-equivalent `npm install --omit=dev` reproductions proved dev-only build tooling unavailable. The user approved committing exact `npm run build` output under `dist/**` while prohibiting prepare/install hooks, new dependencies, package renaming, and lockfile changes.

### External Fixture Substitution

The default public yt-dlp fixture `BaW_jenozKc` was unavailable during APPLY. The mandatory live verification passed with explicit public override `jNQXAC9IVRw`, exactly as the PLAN permits for external fixture failure.

### Audit Concern

The advisory count moved from 0/3/2 to 0/4/2 (critical/high/moderate) without a manifest, lockfile, or dependency change. The user approved the deviation because the added `nanoid` advisories came from external feed changes in the unchanged dev tree.

### GitHub Flow Ordering

PR #18 passed both Socket Security checks and was merged as `b207d66` on 2026-08-09 before this UNIFY summary and lifecycle metadata were finalized. The lifecycle-only follow-up PR #19 then passed both checks and merged as `e57784d`, resolving the ordering deviation without bypassing GitHub Flow.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Pi-equivalent Git installation could not compile with dev dependencies omitted | Committed exact build output after explicit scope approval; clean install retained/imported the extension. |
| Default public YouTube fixture was unavailable | Used the PLAN-authorized public `WATCH_YOUTUBE_URL` override and obtained the mandatory passing run. |
| Audit feed added high advisories in unchanged dev dependencies | Preserved exact counts and user override; no dependency files changed. |
| Implementation PR merged before UNIFY metadata commit | Recorded the deviation and merged the finalized lifecycle artifacts through follow-up PR #19 with passing checks. |

## Next Phase Readiness

**Ready:**
- All three v0.3 phases now satisfy their product acceptance criteria.
- Supported pasted YouTube URLs are resolved, captioned when possible, routed through the actual tool/command UX, and documented for installation and troubleshooting.
- Release preparation can proceed from a fully tested, local-first, model-agnostic implementation.

**Concerns:**
- Dependency audit maintenance remains separate work: current advisory counts are 0 critical / 4 high / 2 moderate in the unchanged dev tree.
- The unscoped npm package name remains unavailable; release installation must continue using Git/local sources unless a scoped package is introduced later.

**Blockers:** None. Phase 16 implementation and lifecycle artifacts are merged; v0.3 is ready for milestone completion/release routing.

---
*Phase: 16-end-to-end-url-ux, Plan: 01*
*Completed: 2026-08-09*
