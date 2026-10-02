---
phase: no-active-phase
plan: 04
type: fix
chain_node: "R7 — no spec impact"
completed: 2026-10-01
---

## Fix Summary

**Issue:** The extension's development tree remained on Pi 0.79.x after the host moved to 1.0.0; npm 12 changed pack JSON shape and broke the packaging assertion.
**Mode:** Standard `/paul:fix`, compressed PLAN → APPLY → UNIFY.
**Chain node:** `R7 — no spec impact`, citing `.paul/PRD.md` R7. Config, tier ordering, transcript policy, and watch runtime behavior are unchanged.
**Approval:** User explicitly requested proceeding after the Pi 1.0.0 compatibility review.
**Branch:** `fix/pi-1-maintenance`; main milestone position remains unchanged.

### Files Changed

| File | Change |
|------|--------|
| `package.json` | Existing Pi dev dependencies → ^1.0.0; update existing Node types, TypeBox, TypeScript 5.x, Vitest 4.x ranges; Node engine → >=22.19.0. Wildcard host peers and absence of runtime dependencies preserved. |
| `package-lock.json` | Refresh and clean-install the locked development/transitive graph; resolve all currently reported advisories. |
| `test/watch/asr-e2e.test.ts` | Update manifest assertions and normalize npm pack array/keyed-object JSON via a pure test-local helper, with two deterministic format regressions. Preserve the real hermetic pack assertion. |
| `README.md` | Match current Pi's Node 22.19 prerequisite. |
| `docs/YOUTUBE-SETUP.md` | Match current Pi's Node 22.19 prerequisite. |
| `docs/LOCAL-ASR-SETUP.md` | Match current Pi's Node 22.19 prerequisite. |

Workflow-owned artifacts: `04-FIX.md`, this summary, STATE and quality/CODI history rows.

### Verification

- Baseline `npm test`: 361 passed / 1 failed / 3 default-skipped (365 total). Named failure: packaging assertion's `packResult[0]` assumption under npm 12.1.0.
- `npm install --ignore-scripts && npm update --ignore-scripts`: success, no new direct dependencies.
- `npm ci --ignore-scripts`: success; lockfile reproducible without lifecycle scripts.
- Full `npm test` after clean install: **364 passed / 0 failed / 3 default-skipped**, 367 total; no tests excluded by name. Restored one failing test and added two format regressions.
- `npm run typecheck`: pass, 0 errors.
- `npm run build`: pass.
- `git diff --exit-code -- dist`: pass, compiled output byte-identical to committed baseline; no production source or dist edits needed.
- `git diff --check`: pass.
- `npm audit --json`: 0 critical / 0 high / 0 moderate / 0 low.
- `npm audit --omit=dev --json`: zero advisories.
- Actual installed **Pi 1.0.0** loader: registers `watch`, `watch_batch`, and `/watch`, zero errors/warnings.
- Invoked the loaded compiled `watch` with the committed local speech fixture, a visual question, and budget 1: tier 3, one non-empty image. No network, model, or live speech setup required.

Resolved local versions: Pi AI/coding-agent 1.0.0, @types/node 22.20.5, TypeBox 1.3.34, TypeScript 5.9.3, Vitest 4.1.11. The Node-types lock resolved a compatible patch above the manifest's ^22.20.4 floor.

### Quality

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Tests passing | 361 | 364 | +3 (1 restored, 2 new) |
| Tests failing | 1 | 0 | -1 |
| Tests skipped | 3 | 3 | stable, live opt-ins only |
| Type errors | 0 | 0 | stable |

No configured lint/formatter or coverage command; those metrics are not fabricated.

| Audit severity | Before | After | New |
|----------------|--------|-------|-----|
| Critical | 0 | 0 | 0 |
| High | 4 | 0 | 0 |
| Moderate | 4 | 0 | 0 |
| Low | 0 | 0 | 0 |

### Decisions and Deviations

- Scope remains compatibility/security maintenance: no cancellation plumbing, new codemode behavior, sampler/router changes, cloud dependency, or tooling major migration.
- Update the package engine alongside docs because the supported current Pi host already requires Node >=22.19.0.
- Keep committed dist unchanged after proving a clean rebuild is byte-identical.
- Clean install emits an upstream `node-domexception@1.0.0` deprecation notice; audit remains zero. No speculative override or new dependency added.
- GitHub Flow: feature branch and PR review/CI gates; no merge authorized or performed. Repository API reports no Actions workflows; do not claim automated test CI exists.
- Unrelated untracked `.codegraph/` remains untouched and excluded.

## Module Execution Reports

Installed registry: `~/.pi/agent/skills/pals/modules.yaml`; hook descriptions/refs loaded in priority order, with bounded scope.

### Post-apply

| Module (priority) | Outcome | Evidence |
|-------------------|---------|----------|
| WALT (100) | PASS | Clean-install full suite 364/0/3 versus baseline 361/1/3; typecheck/build clean. Lint/format skipped: not configured. |
| ARCH (125) | PASS | Only changed TS file is a test; nine unchanged imports obey Test → Any. 443 non-empty-terminal lines by `lines` count, net +17 by git numstat, below >500 / >100 growth triggers. |
| SETH (130) | PASS | Added code parses bounded npm-produced JSON in a test-local helper; no new execution sinks, credentials, auth changes, or production input paths. Dependency findings owned by DEAN. |
| GABE (140) | SKIP | No route/controller/API files changed. |
| DEAN (150) | PASS | Fresh full and production-only audits zero; severity table above. No override or baseline file needed. |
| DANA (155) | SKIP | No schema, query, data-model, or migration files changed. |
| LUKE (160) | SKIP | No UI component files changed. |
| ARIA (165) | SKIP | No UI/HTML/CSS files changed. |
| OMAR (170) | SKIP | No observability/logging/handler changes. |
| DAVE (175) | SKIP | No CI/deployment files changed; no Actions workflow added outside scope. |
| PETE (175) | PASS | Finite test-only JSON transform; no hot-path or runtime dependency changes. |
| REED (180) | SKIP | No retry, timeout, shutdown, or production fallback changes. |
| VERA (185) | SKIP | No privacy/data-collection/storage changes. |
| TODD (200) | PASS | Existing failing packaging regression restored; pure helper directly covered for both output formats; no new failures. |
| DOCS (250) | UPDATED | Package engine and all three relevant prerequisite documents agree on Node 22.19; lock/test changes need no extra public API docs. |
| IRIS (250) | PASS | No unused additions, empty catches, dead/commented code, or review markers in changed code. |
| SKIP (300) | CAPTURED | Source-backed npm JSON compatibility lesson below. |

ARCH boundary rows (from `test/watch/asr-e2e.test.ts`, unchanged imports):

| Import | From layer | To layer | Status |
|--------|------------|----------|--------|
| node:child_process | Test | Node runtime | PASS |
| node:crypto | Test | Node runtime | PASS |
| node:fs/promises | Test | Node runtime | PASS |
| node:os | Test | Node runtime | PASS |
| node:path | Test | Node runtime | PASS |
| node:url | Test | Node runtime | PASS |
| node:util | Test | Node runtime | PASS |
| @earendil-works/pi-coding-agent | Test | Host API types | PASS |
| vitest | Test | Test framework | PASS |

### Post-unify

| Module (priority) | Outcome / side effect |
|-------------------|-----------------------|
| WALT (100) | Appended `fix-04` quality-history row using captured APPLY evidence: tests +3 passes / -1 failure; type errors stable at zero; no UNIFY test rerun. |
| SKIP (200) | Returned the complete source-backed npm JSON lesson below; retained in this workflow-owned summary, no unrelated knowledge search or file creation. |
| CODI (220) | No sibling PLAN/pre-plan blast-radius dispatch for this standard FIX; `no-dispatch-found`, absent counts/symbols `—`, blast_radius `n`; appended one `fix-04` CODI-history row. |
| RUBY (300) | Test-local pure helper (4 lines) keeps transformation separate from npm I/O; changed test file measures 443 lines, git net +17. No new refactor concern warranting scope expansion. |

[dispatch] CODI post-unify: entered fix-04; no-dispatch-found; one history row appended.
[dispatch] post-unify: WALT(100) quality row; SKIP(200) lesson retained; CODI(220) no-dispatch-found row; RUBY(300) no new debt.

### Knowledge (SKIP)

- **Source:** `.paul/fixes/04-FIX-SUMMARY.md`, Issue / Verification; `test/watch/asr-e2e.test.ts`, npm pack JSON compatibility.
- **Phase/Plan:** no-active-phase / fix-04.
- **Type / Title:** lesson / npm pack JSON output is version-dependent.
- **Context:** npm 12.1.0 changed the dry-run pack result from an array to an object keyed by package name, breaking the former first-array-entry assertion.
- **Content:** `Object.values()` lets the same test-local normalization enumerate package entries in both formats. Two deterministic fixtures plus the actual npm dry-run pin both backward and current compatibility.
- **Impact:** Restores hermetic packaging verification without excluding it or requiring a specific npm version; no production code added.

### Result

Fix applied successfully. PLAN → APPLY → UNIFY side loop closed; main milestone remains awaiting definition. Feature branch is ready for PR review and available CI/security checks. No merge performed.
