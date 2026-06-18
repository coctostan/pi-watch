---
phase: 01-tool-activation-spike
plan: 01
subsystem: kernel
tags: [pi-extension, registerTool, setActiveTools, tool-activation, pi-loadout, spike, print-mode]

requires: []
provides:
  - Verified activation recipe for pi custom tools (spikes/01-tool-activation/FINDINGS.md)
  - watch-probe reference extension + model-free activation matrix runner
  - Root-cause identification: pi-loadout governor strips newly-registered tools
affects:
  - 05-watch-tool-primitive
  - sampler/router phases (headless/batch invocation assumptions)

tech-stack:
  added: []
  patterns:
    - "Custom tool = synchronous pi.registerTool() at factory top + promptSnippet (mandatory)"
    - "Tool-governor coexistence: ship as installed package + ensure tool is in user's loadout"

key-files:
  created:
    - spikes/01-tool-activation/watch-probe.ts
    - spikes/01-tool-activation/run-activation-tests.sh
    - spikes/01-tool-activation/FINDINGS.md
  modified: []

key-decisions:
  - "Decision: spike-#1 'Tool not found' gotcha is environmental (pi-loadout), not a pi/-e/print-mode limitation"
  - "Decision: real watch tool must ship as an installed package and be present in the active loadout"

patterns-established:
  - "Pattern: register custom tools synchronously with promptSnippet; setActiveTools is not required for activation"
  - "Pattern: pi.getActiveTools() returns string[] (names), not objects"

duration: ~70min
started: 2026-06-18T11:52:04Z
completed: 2026-06-18T13:02:27Z
---

# Phase 01 Plan 01: Tool-Activation Spike Summary

**Proved pi custom-tool activation works end-to-end (tui/print/json); the spike-#1 "Tool not found" symptom was caused by the `pi-loadout` governor stripping newly-registered tools from the active set, not by the `-e` flag, print mode, trust, or our code.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~70 min |
| Started | 2026-06-18T11:52:04Z |
| Completed | 2026-06-18T13:02:27Z |
| Tasks | 3 completed (+1 corrective fix) |
| Files modified | 3 created (+ generated report evidence) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Tool registration is visible | Pass | `watch_probe` in `getAllTools()` in every mode/load method; report JSON written with `mode` + membership. |
| AC-2: Active-set membership characterized | Pass | Matrix across `-e`/auto-discovery × print/json. Corrected probe shows `inActive:true` before & after `setActiveTools` in a clean env. Spike-#1 reproduction explicitly identified (governor strips it). |
| AC-3: End-to-end executability + print-mode verdict | Pass | `pi --no-extensions -e watch-probe.ts -p "..."` → model returned `WATCH_PROBE_OK:hello`. Verdict: WORKS in all modes; no print-mode limitation. |
| AC-4: Reusable activation recipe for Phase 5 | Pass | FINDINGS.md provides copy-pasteable recipe (register + promptSnippet; ship as package; ensure in loadout). |

## Module Execution Reports

Module evidence carried forward from APPLY dispatch (advisory + enforcement) plus pre/post-unify dispatch.

### Pre/Post-Unify Dispatch
- `[dispatch] pre-unify: 0 modules registered for this hook` — no installed module registers `pre-unify`.
- `[dispatch] post-unify: ...` — see post-unify subsections below (CODI, RUBY, SKIP, WALT register `post-unify`).

### Quality (WALT)
No test/lint/typecheck runner detected (no `package.json`/manifest in repo). `pre-apply` and `post-apply` WALT skipped; no baseline captured, no regression possible. `post-unify`: no quality data to delta — recorded as skipped row (no metrics invented).

### Tests (TODD)
No test infrastructure; `type: research` spike with no business logic. All TODD hooks (pre-plan/post-plan/pre-apply/post-task/post-apply) skipped. No block.

### Advisory (post-apply)
All advisory modules PASS or skipped — no in-scope files for their domains:
- SETH: no security concerns (no secrets/sinks/auth wiring).
- OMAR: no observability concerns (diagnostic write wrapped in try/catch + fallback).
- PETE: no performance concerns (one-shot write; no hot-path loops/sync I/O).
- VERA / REED: no privacy / resilience concerns.
- ARCH: no boundary/drift findings (flat spike dir).
- IRIS: no review markers / dead code.
- DOCS: not applicable (spike + docs scope).
- DEAN: skipped — no dependency manifest/lockfile (no npm deps added).
- DANA / GABE / LUKE / ARIA / DAVE: skipped — no data / API / UI / CI files.

### Knowledge (SKIP)
Candidate captured: "A `setActiveTools`-allowlist governor extension (e.g. pi-loadout) silently removes newly-registered custom tools from the model-facing active set at `session_start`, in every run mode and load method. Mitigation: ship as installed package + ensure tool is in the active loadout." Source: spikes/01-tool-activation/FINDINGS.md.

## Accomplishments

- Reproduced and **root-caused** the spike-#1 gotcha to `pi-loadout` (`pi.setActiveTools([...allowlist])` at session_start), with controls against the official `dynamic-tools.ts` example and the `pi-extension-template` starter.
- Achieved a genuine end-to-end LLM tool invocation (`WATCH_PROBE_OK:hello`) under `--no-extensions`.
- Produced a copy-pasteable Phase-5 activation recipe; corrected the premise that print mode is limited (it is not).
- Discovered and documented the `getActiveTools()` return-shape (string[]).

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: watch-probe extension | `a1dc67e` | feat | Probe tool + session_start self-diagnostic + /watch-probe-report |
| Task 2: activation test runner | `3f8f9e5` | feat | Model-free matrix (load method × mode), node summaries, cleanup trap |
| (corrective) active-set fix | `b29cc60` | fix | getActiveTools() returns string[]; corrected inActive measurement |
| Task 3: FINDINGS.md | `6519bc8` | docs | Verdict table, root cause, Phase-5 recipe + cited evidence |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `spikes/01-tool-activation/watch-probe.ts` | Created | Throwaway probe extension + corrected self-diagnostic |
| `spikes/01-tool-activation/run-activation-tests.sh` | Created | Model-free activation matrix runner |
| `spikes/01-tool-activation/FINDINGS.md` | Created | Authoritative verdict + Phase-5 recipe |
| `spikes/01-tool-activation/report.*.json` | Created (untracked + selected committed) | Cited diagnostic evidence |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Spike-#1 gotcha is environmental (pi-loadout), not pi/-e/print | Controls: official example + template both fail w/ default env; all pass under `--no-extensions` | Removes a false architectural constraint; headless/batch invocation is viable |
| Real `watch` ships as installed package, present in loadout | Governor allowlist strips ad-hoc tools | Shapes Phase-5 packaging + user setup docs |
| `setActiveTools` not required for activation | Clean-env reports show inActive:true before any setActiveTools | Simpler extension; only needed for governor coexistence |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Essential — corrected a probe measurement bug that caused a false early diagnosis |
| Scope additions | 1 | Necessary investigation (control experiments + provider/governor isolation) within the spike's stated goal |
| Deferred | 3 | Logged as Phase-5 follow-ups in FINDINGS.md |

**Total impact:** Findings strengthened, not scope creep. The investigation that overturned the print-mode hypothesis was within the plan's de-risking objective.

### Auto-fixed Issues

**1. [Diagnostic] `getActiveTools()` return-shape misuse**
- **Found during:** Task 3 checkpoint investigation (after end-to-end failures)
- **Issue:** Probe used `pi.getActiveTools().map(t => t.name)`; the API returns `string[]`, so `inActive`/`activeToolNames` were always false/`[null]` — a misleading early signal.
- **Fix:** Use names directly; rebuild `setActiveTools` union from string names.
- **Files:** `spikes/01-tool-activation/watch-probe.ts`
- **Verification:** Clean-env reports show `inActive:true`; e2e returns `WATCH_PROBE_OK:hello`.
- **Commit:** `b29cc60`

### Deferred Items

- Phase-5 packaging: decide `watch` distribution source and document the loadout-enable step.
- Verify `/watch` command path is not also governed by loadout.
- Consider filing the `getActiveTools()` return-shape doc ambiguity upstream.

### Verify-command deviation (recorded)
Task 1's planned `<verify>` grepped `'"inAll":true'` (compact JSON); the probe emits pretty-printed JSON (`"inAll": true`). Verified substance with a space-tolerant check — equivalent, no functional impact.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| End-to-end tool call failed in print, json, and TUI | Ran controls (official example + template) → isolated to environment; `--no-extensions` proved success; traced to `pi-loadout` setActiveTools allowlist |
| False early diagnosis (active-set always false) | Found `getActiveTools()` returns string[]; corrected probe (within `handle_failures` retry budget) |

## Next Phase Readiness

**Ready:**
- Activation recipe is proven and documented for the Phase-5 `watch` tool primitive.
- Headless (`-p`/json) invocation is viable — unblocks future batch/subagent designs that were thought to be print-limited.

**Concerns:**
- Tool-governor coexistence (`pi-loadout`) must be handled in Phase 5 (packaging + loadout enablement), or the shipped tool will be invisible in governed environments.
- `spikes/01-tool-activation/` is throwaway; the real tool is a fresh package, not a refactor of `watch-probe.ts`.

**Blockers:**
- None.

---
*Phase: 01-tool-activation-spike, Plan: 01*
*Completed: 2026-06-18*
