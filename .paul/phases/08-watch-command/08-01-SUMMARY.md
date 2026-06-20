---
phase: 08-watch-command
plan: 01
subsystem: ui
tags: [watch-command, slash-command, pi-registerCommand, sendUserMessage, ux-wrapper, pure-core, effect-boundary, tier-3, agent-delegation]

requires:
  - phase: 05-watch-tool-primitive
    provides: the `watch` tool (effect boundary + WATCH_PARAMS) that the /watch command wraps
  - phase: 07-config-surface
    provides: resolveWatchConfig typed config the wrapped tool runs off (command adds no new config)
provides:
  - src/watch/command.ts — pure /watch command core (parseWatchCommand, buildWatchPrompt, runWatchCommand) + injected WatchCommandEffects
  - pi.registerCommand("watch", …) wiring at the extension boundary, delegating to the watch tool via pi.sendUserMessage
  - command surface exported from the watch barrel
affects:
  - 09-batching (a batch command/flow can reuse the same parse + agent-delegation UX pattern)

tech-stack:
  added: []
  patterns:
    - "Slash command as a thin UX wrapper: pure parse/prompt/run core (pi-free) + effects (ctx.ui.notify, pi.sendUserMessage) injected at the extension boundary"
    - "Command delegates to the agent via pi.sendUserMessage rather than running the pipeline inline — the only path that preserves tier-3 (tool-result ImageContent must reach the orchestrator, not a void-returning handler)"

key-files:
  created:
    - src/watch/command.ts
    - test/watch/command.test.ts
  modified:
    - src/watch/extension.ts
    - src/watch/index.ts

key-decisions:
  - "Decision (Task 1 checkpoint): option-a — the /watch command delegates to the agent via pi.sendUserMessage; direct in-handler pipeline invocation (option-b) was rejected because it breaks tier 3"

patterns-established:
  - "Pattern: a slash command wrapping a tool stays a pure parse/build core + injected effects, registered synchronously alongside the tool in the same extension factory (activation recipe)"
  - "Pattern: when a command must preserve tool-result images for the orchestrator, steer the agent to call the tool (sendUserMessage) instead of executing the pipeline in the handler"

duration: ~12min
started: 2026-06-20T16:00:00Z
completed: 2026-06-20T16:12:00Z
---

# Phase 8 Plan 01: /watch Command Summary

**The `/watch` slash command now ships as a thin UX wrapper over the `watch` tool primitive: a pure parse/prompt/run core (`src/watch/command.ts`) plus a synchronous `pi.registerCommand("watch", …)` at the extension boundary that — by the Task-1 decision (option-a) — delegates to the agent via `pi.sendUserMessage` so the agent invokes the tool through the normal tool-call flow, preserving all three tiers including tier-3 frames reaching the orchestrator.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~12 min |
| Started | 2026-06-20T16:00:00Z |
| Completed | 2026-06-20T16:12:00Z |
| Tasks | 3 (1 decision checkpoint + 2 auto) |
| Files modified | 4 (2 created, 2 modified) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Argument parsing splits ref + question and rejects incomplete input | Pass | `parseWatchCommand` splits the first whitespace-delimited token as `ref`, trims the remainder as `question`; empty / whitespace-only / bare-ref input → `{ ok: false, usage }`. 8 parse specs (happy path, URL ref, whitespace trimming, multi-word question, empty, whitespace-only, bare ref, ref+trailing-space). Total/never-throws. |
| AC-2: Command delegates a valid request to the watch tool via the agent loop | Pass | `runWatchCommand` (effect-injected) calls `send` exactly once with `buildWatchPrompt(ref, question)` on valid input and never error-notifies; invalid input notifies the usage string once at "warning" and never sends. 4 runner/prompt specs with stub effects. |
| AC-3: Command wired at the effect boundary with clean gates and no new deps | Pass | `pi.registerCommand("watch", …)` registered synchronously in `watchExtension(pi)` alongside the tool; surface exported from `src/watch/index.ts`. `npm run typecheck` + `npm run build` clean; `npm test` 117/117; `npm audit` 0 vulns, 0 new deps; frozen core (sampler/router/config/tier-runner/tier2) unchanged. |

## Module Execution Reports

### Quality (WALT)
| Metric | Before | After | Delta | Trajectory |
|--------|--------|-------|-------|------------|
| Tests passing | 105 | 117 | +12 | ▲ |
| Typecheck | clean | clean | 0 | ● |
| Build | clean | clean | 0 | ● |

**Overall:** ▲ improved — +12 command specs (parse happy/invalid paths, prompt builder, effect-injected runner with stub notify/send); all green. One typecheck miss caught pre-commit at the Task-2 gate (regex capture groups typed `string | undefined` under `noUncheckedIndexedAccess`) and fixed before the Task-2 commit.

### Dependencies (DEAN)
| Check | Result |
|-------|--------|
| `npm audit` | 0 vulnerabilities |
| New runtime dependencies | 0 (only existing `@earendil-works/pi-coding-agent` peer types + `vitest`) |

**Status:** PASS — baseline preserved; honors AGENTS.md "ask first before adding dependencies."

### Architecture (ARCH)
- `src/watch/command.ts` is pure and pi-free (no package import); the single new boundary coupling is `runWatchCommand` imported into `extension.ts`, which respects the established single-effect-boundary convention. No upward/cross-layer violation; the frozen pure core (sampler/router/config/tier-runner) and the tier-2 adapter are untouched.

### Security (SETH)
- The command handles only `ref` + `question` text; no secrets, no new env keys. The built prompt embeds user text but is delivered to the agent (`pi.sendUserMessage`), not executed as a shell/command, so no injection surface is introduced. PASS.

### UI/UX (LUKE)
- Clear failure mode: invalid/incomplete input surfaces `WATCH_COMMAND_USAGE` via `ctx.ui.notify(..., "warning")` rather than silently failing. Command description registered for discoverability.

### Deploy (DAVE)
- **Carry (unchanged from Phases 5–7):** still no `.github/workflows/ci.yml` — the GitHub-Flow merge gate remains Socket-Security-only (no test/build CI). Recommend a dedicated CI plan. Out of scope for this UX plan.

### Advisory (DOCS / RUBY / IRIS)
- DOCS: DESIGN §1/§7 already names the `/watch` command — no design drift; docstrings added to `command.ts` + a barrel note.
- RUBY: pure-core/effect-boundary split keeps the command thin; no debt introduced.
- IRIS: no review markers, no dead/commented code.

_Dispatch evidence: pre-apply WALT baseline 105/105 + TODD (execute plan, no RED-first task) — no block. post-task(2,3) WALT ▲ / DEAN PASS. post-apply advisory (ARCH/SETH/LUKE/DOCS/RUBY/IRIS) + enforcement (DEAN PASS, WALT gate PASS) — no block. pre-unify advisory-only, no block. post-unify recorded below._

## Accomplishments

- Shipped the `/watch` command as a pure parse/prompt/run core (`parseWatchCommand`, `buildWatchPrompt`, `runWatchCommand`) with effects injected at the extension boundary — mirroring the tier-2 adapter's injected-`fetchImpl` convention, so the whole command is unit-testable without the pi runtime.
- Registered the command synchronously alongside the `watch` tool in the same factory (Phase-1 activation recipe), wiring `ctx.ui.notify` + `pi.sendUserMessage`; the existing tool registration is untouched (additive only).
- Resolved the load-bearing execution-strategy decision (option-a) so tier 3 (frames-into-context → orchestrator, DESIGN §5 #1) is preserved: the command steers the agent to the tool rather than running the pipeline in a void-returning handler.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 2: pure command core + tests + barrel export | `e31576f` | feat | src/watch/command.ts (parse/prompt/run) + 12 specs; exported from the watch barrel |
| Task 3: register /watch at the extension boundary | `2ae4c2c` | feat | pi.registerCommand("watch", …) delegating to runWatchCommand; suite 117/117 |

Task 1 was a `checkpoint:decision` (no commit) — resolved to **option-a**.
Plan metadata commit: pending (this UNIFY).

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/watch/command.ts` | Created | Pure /watch core: `WATCH_COMMAND_USAGE`, `parseWatchCommand`, `buildWatchPrompt`, `runWatchCommand`, `WatchCommandParse`/`WatchCommandEffects` types |
| `test/watch/command.test.ts` | Created | 12 specs: parse (valid/invalid), prompt builder, runner with stub effects |
| `src/watch/extension.ts` | Modified | Imports `runWatchCommand`; registers `/watch` synchronously alongside the tool; factory docstring updated |
| `src/watch/index.ts` | Modified | Exports the command surface from the barrel with a UX-layer note |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| option-a: the /watch command delegates to the agent via `pi.sendUserMessage` | A slash-command handler returns `void` and can only notify text; it cannot deliver tier-3 frames (tool-result ImageContent destined for the orchestrator, DESIGN §5 #1). Delegating to the agent reuses the tool's `execute` path untouched and preserves all three tiers. | Command stays a thin wiring boundary; no duplication/fork of the tool pipeline; budget/resolution picked by the router/config defaults |
| Defer budget/resolution flag parsing + autocomplete | Under option-a the agent/router pick budget/resolution from question intent + config defaults, so v0.1 flags add no value; autocomplete is an optional nicety | Recorded as deferred (not lost) — candidate for a later phase |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Trivial — regex capture-group typecheck error, fixed before the Task-2 commit |
| Scope additions | 0 | — |
| Deferred | 2 | Budget/resolution flags + autocomplete (planned deferrals per the boundaries) |

**Total impact:** None material — plan executed as written; the decision checkpoint resolved to the recommended option.

### Auto-fixed Issues

**1. [Types] Regex capture groups typed `string | undefined` under `noUncheckedIndexedAccess`**
- **Found during:** Task 2 (pure command core), at the typecheck gate.
- **Issue:** The initial `parseWatchCommand` used `trimmed.match(/^(\S+)\s+([\s\S]+)$/)` and indexed `match[1]`/`match[2]`, which TS types as possibly `undefined` (TS2532/TS2322).
- **Fix:** Replaced with an index-based split — `trimmed.search(/\s/)` + `slice` — which types cleanly and keeps identical behavior.
- **Files:** `src/watch/command.ts`
- **Verification:** `npm run typecheck` clean; 12 command specs green afterward.
- **Commit:** `e31576f` (fixed before the Task-2 commit).

### Deferred Items

Recorded per the plan boundaries, for a future phase:
- Budget/resolution flag parsing on the command surface.
- `getArgumentCompletions` autocomplete for `/watch`.

## Issues Encountered

None beyond the auto-fixed typecheck error above.

## Next Phase Readiness

**Ready:**
- The tool + command pairing the project was built around is complete (PROJECT.md key decision: "build the tool first; the command + batching wrap it"). Phase 9 (batching) can wrap the same surfaces.
- The parse + agent-delegation UX pattern is reusable for a future batch command/flow.

**Concerns:**
- DAVE: still no `.github/workflows/ci.yml` (carried from Phases 5–7) — the merge gate remains Socket-Security-only (no test/build CI). Recommend a dedicated CI plan.
- The `/watch` end-to-end path (agent actually invoking the tool from the steering message) is unit-verified at the command-core level only; live agent-loop behavior depends on the tool being enabled in the active loadout (FINDINGS #4) — same activation requirement as the tool itself.
- Deferred budget/resolution flags + autocomplete if/when a richer command surface is wanted.

**Blockers:**
- None.

---
*Phase: 08-watch-command, Plan: 01*
*Completed: 2026-06-20*
