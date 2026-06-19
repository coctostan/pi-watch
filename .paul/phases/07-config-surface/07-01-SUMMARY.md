---
phase: 07-config-surface
plan: 01
subsystem: config
tags: [config, typed-config, baseURL, model-id, abort-signal, fetch-timeout, tier-2, precedence, pure-core, env-bridge]

requires:
  - phase: 06-tier-adapters
    provides: src/watch/tier2.ts — Tier2Config + resolveTier2ConfigFromEnv env bridge + createTier2Runner({ config?, fetchImpl? })
  - phase: 03-sampler-implementation
    provides: sample() SampleOptions (budget/resolution flow through here)
  - phase: 02-sampler-data-contract
    provides: ResolutionTier type
provides:
  - src/config — typed WatchConfig + pure resolveWatchConfig(env, overrides?) resolver (precedence: overrides > env > defaults)
  - config-driven tier-2 runner wiring at the extension boundary (single env read)
  - tier-2 fetch AbortSignal timeout (timeoutMs) — abort escalates to tier 3 (null), never throws
affects:
  - 08-watch-command (consumes the resolved config + tool params surface)
  - 09-batching (per-video config overrides layer on the same resolver)

tech-stack:
  added: []
  patterns:
    - "Pure config resolver: resolveWatchConfig(env, overrides?) reads only its env arg; the single real env read happens at the extension boundary (process.env passed in)"
    - "Precedence layering: explicit overrides > environment > built-in defaults, applied per field; total/never-throws on malformed input"
    - "Config-driven adapter: createTier2Runner({ config }) is built once from the resolved config — the adapter no longer self-reads process.env at the boundary"
    - "AbortSignal.timeout bounds the tier-2 fetch; abort flows through the existing null-to-escalate catch (Node ≥20, zero deps)"

key-files:
  created:
    - src/config/config.ts
    - src/config/index.ts
    - test/config/config.test.ts
  modified:
    - src/watch/tier2.ts
    - src/watch/extension.ts
    - src/watch/index.ts
    - test/watch/tier2.test.ts

key-decisions:
  - "Decision (Task 1 checkpoint): option-a — dedicated pure src/config module; precedence overrides > env > defaults; file-config + tier-order override deferred"

patterns-established:
  - "Pattern: tool configuration is a pure resolver over env + explicit overrides, composed at the effect boundary; effectful adapters receive resolved config, they do not read env themselves"
  - "Pattern: network calls in adapters carry a configurable AbortSignal timeout and escalate (null) on abort rather than throwing through the host"

duration: ~15min
started: 2026-06-19T17:11:00Z
completed: 2026-06-19T17:22:00Z
---

# Phase 7 Plan 01: Config Surface Summary

**The `watch` tool now runs off a single typed config surface (`src/config/resolveWatchConfig`) that replaces the raw `WATCH_TIER2_*` env bridge — resolving the tier-2 endpoint, frame budget, resolution, and a fetch timeout from defaults < env < explicit overrides — and the tier-2 `fetch` is bounded by an `AbortSignal` timeout that cleanly escalates to tier 3 on abort (closing the PETE carry).**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15 min |
| Started | 2026-06-19T17:11:00Z |
| Completed | 2026-06-19T17:22:00Z |
| Tasks | 3 (1 decision checkpoint + 2 auto) |
| Files modified | 7 (3 created, 4 modified) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Typed config resolves from defaults + env with documented precedence | Pass | `resolveWatchConfig` maps `WATCH_TIER2_*` (via `resolveTier2ConfigFromEnv`) + `WATCH_BUDGET`/`WATCH_RESOLUTION`/`WATCH_TIER2_TIMEOUT_MS`; tier2 is `null` when unconfigured; explicit overrides > env > defaults. 9 specs, incl. malformed-env fallback and `tier2: null` override. |
| AC-2: Extension wires the typed config; tool-call params override config defaults | Pass | `extension.ts` resolves config once, builds a config-driven `createTier2Runner({ config: config.tier2, timeoutMs })`, and passes `params.budget ?? config.budget` / `params.resolution ?? config.resolution` to `sample()`; `route()`/`walkTierChain` behaviour unchanged. |
| AC-3: Tier-2 fetch honours a timeout and escalates on abort; gates stay clean | Pass | `timeoutMs` attaches `AbortSignal.timeout`; abort rejection → `null` (escalate), never throws; API key never logged. Typecheck + build clean, `npm audit` 0 vulns, 0 new deps. 3 new tier-2 specs (signal attach, no-signal default, abort→null). |

## Module Execution Reports

### Quality (WALT)
| Metric | Before | After | Delta | Trajectory |
|--------|--------|-------|-------|------------|
| Tests passing | 93 | 105 | +12 | ▲ |
| Typecheck | clean | clean | 0 | ● |
| Build | clean | clean | 0 | ● |

**Overall:** ▲ improved — +9 config-resolver specs (precedence/tier-2 mapping/malformed-env fallback) and +3 tier-2 timeout/abort specs; all green. One typecheck miss caught pre-commit (`Tier` imported from the wrong module) and fixed before the Task-3 commit.

### Dependencies (DEAN)
| Check | Result |
|-------|--------|
| `npm audit` | 0 vulnerabilities |
| New runtime dependencies | 0 (Node ≥20 global `fetch` + `AbortSignal.timeout`) |

**Status:** PASS — baseline preserved; honors AGENTS.md "ask first before adding dependencies."

### Architecture (ARCH)
- New `src/config/` imports only the `ResolutionTier` contract type and the `Tier2Config` type + `resolveTier2ConfigFromEnv` helper from the watch module — no upward/cross-layer violation. The effect boundary stays in `extension.ts` (single `process.env` read) and `tier2.ts` (the fetch); `route.ts`, `walkTierChain`, and the sampler pure core are untouched.

### Security (SETH)
- `apiKey` sourced from env only; `Authorization: Bearer` built by the pure request builder, never logged. New env keys (`WATCH_BUDGET`, `WATCH_RESOLUTION`, `WATCH_TIER2_TIMEOUT_MS`) carry no secrets. Scan clean. PASS.

### Resilience / Performance (REED / PETE)
- Closes the Phase-6 PETE carry: the tier-2 `fetch` is now bounded by a configurable `AbortSignal.timeout`; on abort the runner resolves to `null`, consistent with the established null-to-escalate contract — a net resilience gain, no new failure mode through the host.

### Advisory (DOCS / RUBY / IRIS)
- DOCS: docstrings updated in `config.ts`, `index.ts` (config + watch barrels), `tier2.ts`, `extension.ts`; DESIGN §4 unchanged (config stays `baseURL` + `model id`) — no drift.
- RUBY: pure resolver cleanly split from the env read + fetch effects; no debt introduced.
- IRIS: no review markers, no dead/commented code.

_Dispatch evidence: pre-apply WALT baseline (93/93) captured; pre-apply TODD (execute plan, no RED-first task) — no block. Post-apply advisory + enforcement ran (WALT ▲, DEAN PASS, ARCH/SETH clean). pre-unify produced no blocking action; post-unify CODI/RUBY/SKIP recorded below._

## Accomplishments

- Shipped `src/config/` as a dedicated pure module: `WatchConfig` + `resolveWatchConfig(env, overrides?)` with documented per-field precedence (overrides > env > defaults) and total/never-throws parsing for budget/resolution/timeout.
- Replaced the adapter's implicit env dependency with a config-driven runner built once at the boundary; per-call `WATCH_PARAMS` (budget/resolution) now layer over config defaults without touching the frozen router.
- Added a configurable `AbortSignal` timeout to the tier-2 `fetch` (PETE carry closed) with deterministic specs that exercise signal attach, no-signal default, and abort→null escalation — no live model, no slow timers.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 2: pure config module + tests | `beb53f6` | feat | src/config (WatchConfig + resolveWatchConfig); 9 precedence/mapping specs |
| Task 3: wire config at boundary + tier-2 timeout | `45eed8b` | feat | extension.ts config wiring; tier2 timeoutMs/AbortSignal; barrel note; +3 specs (93→105) |

Task 1 was a `checkpoint:decision` (no commit) — resolved to **option-a**.
Plan metadata commit: pending (this UNIFY).

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/config/config.ts` | Created | `WatchConfig` type + pure `resolveWatchConfig` resolver + DEFAULT_* constants |
| `src/config/index.ts` | Created | config module barrel (resolveWatchConfig, WatchConfig, defaults) |
| `test/config/config.test.ts` | Created | 9 specs: tier-2 mapping, env values, malformed fallback, precedence |
| `src/watch/tier2.ts` | Modified | `createTier2Runner` gains `timeoutMs` → `AbortSignal.timeout`; docstring notes config surface as composition point |
| `src/watch/extension.ts` | Modified | resolves config once; config-driven runner table; `params.X ?? config.X` defaults |
| `src/watch/index.ts` | Modified | barrel comment pointing to `src/config` as the typed composition point |
| `test/watch/tier2.test.ts` | Modified | +3 AC-3 specs (signal attach / no-signal default / abort→null); suite 93→105 |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| option-a: dedicated pure `src/config` module; precedence overrides > env > defaults | Mirrors the project's pure-core/effect-boundary split; reuses the Phase-6 seam exactly; smallest testable change; no new file I/O | tier-2 adapter is config-driven (no self env read at the boundary); per-call params layer cleanly; clean home for future config |
| Defer file-based config (`watch.config.json`) + tier-order override | Out of v0.1 scope; not needed for local-first default flow | Recorded as deferred (not lost) — candidate for a later phase |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Trivial — wrong-module type import caught by typecheck, fixed before commit |
| Scope additions | 0 | — |
| Deferred | 2 | File-config + tier-order override (planned deferrals per Task-1 decision) |

**Total impact:** None material — plan executed as written; the decision checkpoint resolved to the recommended option.

### Auto-fixed Issues

**1. [Imports] `Tier` imported from the wrong module**
- **Found during:** Task 3 (boundary wiring), at the typecheck gate.
- **Issue:** `extension.ts` imported `type Tier` from `./tier-runner.js`, which re-declares but does not export it (TS2459).
- **Fix:** Import `type Tier` from `../router/index.js` (its actual source).
- **Files:** `src/watch/extension.ts`
- **Verification:** `npm run typecheck` + `npm run build` clean afterward.
- **Commit:** `45eed8b` (fixed before the Task-3 commit).

### Deferred Items

Recorded per the Task-1 decision (option-a scope limit), for a future phase:
- File-based config (e.g. `watch.config.json`) layer.
- Tier-order override in config.

## Issues Encountered

None beyond the auto-fixed import above.

## Next Phase Readiness

**Ready:**
- A single typed config surface now feeds the tier-2 endpoint, budget, resolution, and fetch timeout — Phase 8 (`/watch` command) and Phase 9 (batching) can layer per-call/per-video overrides on the same `resolveWatchConfig` resolver.
- Tier-2 calls are bounded (timeout → escalate); the null-to-escalate contract is intact across all three tiers.

**Concerns:**
- DAVE: still no `.github/workflows/ci.yml` (carried from Phases 5–6) — the merge gate remains Socket-Security-only (no test/build CI). Recommend a dedicated CI plan; out of scope for this config plan.
- Deferred file-config + tier-order override (above) if/when a non-env config source is wanted.
- End-to-end against a real `mlx_vlm.server` remains unverified in CI (DESIGN §5 #2 spike covers it); the timeout path is unit-tested via injected fetch only.

**Blockers:**
- None.

---
*Phase: 07-config-surface, Plan: 01*
*Completed: 2026-06-19*
