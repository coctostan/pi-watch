---
phase: 05-watch-tool-primitive
plan: 01
subsystem: api
tags: [pi-extension, custom-tool, tier-router, frames-into-context, typebox, watch]

requires:
  - phase: 02-sampler-data-contract
    provides: WatchedFrameSet type family (imported as types)
  - phase: 03-sampler-implementation
    provides: sample() async entry point (ffprobe/ffmpeg + best-effort transcript)
  - phase: 04-router
    provides: route(), routeContextFromSet(), RoutingDecision/Tier
provides:
  - watch pi custom tool (registered extension factory, end-to-end pipeline)
  - walkTierChain() pure tier-walk core (consumes RoutingDecision.tiers)
  - framesToToolResultContent() tier-3 frame→ImageContent serializer
  - TierRunner seam (null = unavailable/escalate) for Phase-6 tier 1/2 adapters
  - "pi": { extensions: ["./dist/watch/extension.js"] } package manifest entry
affects:
  - 06-tier-adapters
  - 08-watch-command

tech-stack:
  added: ["@earendil-works/pi-coding-agent (types-only: peerDependencies \"*\" + devDep pin ^0.79.8)"]
  patterns:
    - "Pure tier-walk core (pi-free, local content union) + thin effect boundary (extension.ts)"
    - "TierRunner returns null to escalate; tier 3 is total (universal fallback)"
    - "Synchronous registerTool with mandatory promptSnippet (Phase-1 activation recipe)"

key-files:
  created:
    - src/watch/tier-runner.ts
    - src/watch/extension.ts
    - src/watch/index.ts
    - test/watch/tier-runner.test.ts
  modified:
    - package.json

key-decisions:
  - "Decision: ExtensionAPI type source = option-a (real @earendil-works/pi-coding-agent types), placed in peerDependencies \"*\" per docs/packages.md + devDep pin for local build/CI"
  - "Decision: resolution param uses Type.Union (not StringEnum) to avoid a 2nd runtime dep; StringEnum migration deferred to Phase 6"

patterns-established:
  - "Pattern: watch module = pure core (tier-runner.ts) + effect boundary (extension.ts); contract/sampler/router imported, never modified"
  - "Pattern: pi-bundled packages go in peerDependencies \"*\", not dependencies"

duration: ~58min
started: 2026-06-19T14:27:56Z
completed: 2026-06-19T15:28:16Z
---

# Phase 5 Plan 01: watch tool primitive Summary

**The load-bearing `watch` pi custom tool now answers a video question end-to-end (`sample → route → walkTierChain`), with tier 3 (frames-into-context) fully implemented and live-verified, and tiers 1–2 as escalating Phase-6 seams.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~58 min |
| Started | 2026-06-19T14:27:56Z |
| Completed | 2026-06-19T15:28:16Z |
| Tasks | 3 auto + 2 checkpoints completed |
| Files modified | 5 (4 created, 1 modified) + package-lock.json |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Tier walk escalates through stubs and resolves at tier 3 | ✅ Pass | Unit spec: `[1,2,3]`/`[2,3]` with default stubs → tier 3; defensive throw on empty chain. |
| AC-2: Tier walk stops at the first available tier | ✅ Pass | Unit spec: fake tier-2 runner returns → tier 3 never invoked (spy flag asserts). |
| AC-3: Tier-3 serializer hands frames to orchestrator as ImageContent | ✅ Pass | Unit spec: one image part/frame in order; shape `{type:"image",data,mimeType}`; mm:ss adjacency; transcript included when present, omitted when source "none". |
| AC-4: watch tool registered + pipeline runs end-to-end | ✅ Pass | Factory default-export probe (`typeof f === "function"`) + live e2e: model invoked `watch`, execute composed sample→route→walk, returned TextContent\|ImageContent. |
| AC-5: Package builds, typechecks, declares pi extension entry | ✅ Pass | build/typecheck/test exit 0; suite 73/73; `dist/watch/extension.js` emitted; `"pi".extensions` present; npm audit 0 vulns. |

## Module Execution Reports

<!-- Finalized during UNIFY from carried post-apply annotations + pre/post-unify dispatch. -->

### Pre-Plan Dispatch (carried from PLAN)
21 modules registered. ARCH: new `src/watch/` module, pure-core/effect-boundary split honored, downstream-only imports. SETH: no secret-like literals. TODD: new pure core (`walkTierChain`, `framesToToolResultContent`) → Task 1 ships specs first; plan stayed `type: execute`. CODI: seeds had no current dependents (Phase 5 is first consumer). DEAN: `npm audit` 0 vulns baseline.

### Pre-Apply Dispatch
TODD baseline 64/64 ✓; DEAN baseline 0 vulns ✓; ARCH boundaries noted; SETH no secrets. Task order recorded T1 → checkpoint:decision → T2 → T3 → checkpoint:human-verify.

### Post-Task / Post-Apply Dispatch
- **TODD** (Task 1): 9 new pure-core unit specs shipped specs-first; suite 64→73. ✓
- **ARCH** (Task 2): effect boundary isolated in `extension.ts`; imports downstream-only; stable surfaces untouched. ✓
- **SETH** (Task 2): no secrets/new spawns/sinks (effects stay in sampler). ✓
- **DEAN** (Task 3, post-apply re-audit): `npm audit` 0 vulnerabilities; types-only devDep carries no runtime advisory surface. ✓ PASS
- **DAVE**: still no `.github/workflows/ci.yml` (only Socket Security runs on PRs) — advisory CARRY, CI creation out of scope.

### Pre/Post-Unify Dispatch
- **pre-unify**: TODD (no test gaps, 73/73), DEAN (no block), ARCH (boundaries held), DOCS (drift notes: typebox placement, loadout-enable step). No `action: block`.
- **post-unify**: enforcement re-confirmed suite green + 0 vulns at loop close; DOCS carries logged below. No blocking findings.

### Quality
| Metric | Before | After | Delta | Trajectory |
|--------|--------|-------|-------|------------|
| Tests passing | 64 | 73 | +9 | ▲ |
| Vulnerabilities | 0 | 0 | 0 | ● |
| Build/typecheck | 0 err | 0 err | — | ● |

## Accomplishments

- Shipped the project's load-bearing seam: the `watch` tool composes the three stable surfaces (sampler/router/contract) into a working end-to-end primitive.
- Tier 3 (frames-into-context) fully implemented and **live-verified** — model correctly read red→green→blue scene order from returned frames, proving tool-result images reach the orchestrator under a real session (the Phase-1 governor risk, cleared via `--no-extensions` activation proof).
- Established a clean `TierRunner` seam so Phase-6 tier 1/2 adapters drop in behind a stable signature with no orchestrator changes.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: Pure tier-walk core + tier-3 serializer + specs | `8f79e18` | feat | tier-runner.ts, index.ts, 9 unit specs (AC-1/2/3) |
| Task 2: Register watch tool + wire pipeline | `155ae19` | feat | extension.ts effect boundary; sample→route→walk; add types-only devDep |
| Task 3: Package pi extension entry + verify | `2b01e05` | chore | `pi.extensions` manifest + peerDependencies; full suite green |

Plan metadata commit: pending (at plan completion, with SUMMARY + STATE + ROADMAP).

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/watch/tier-runner.ts` | Created | Pure pi-free tier-walk core: `walkTierChain`, `framesToToolResultContent`, tier1/2/3 runners, `defaultRunners`. |
| `src/watch/extension.ts` | Created | Effect boundary: registers `watch`, composes sample→route→walk, graceful error degradation. |
| `src/watch/index.ts` | Created | Barrel: re-exports tier-runner symbols + extension default/`WATCH_PARAMS`/`WatchInput`. |
| `test/watch/tier-runner.test.ts` | Created | 9 Vitest specs for AC-1/2/3 (in-memory fixtures, no ffmpeg/model). |
| `package.json` | Modified | `pi.extensions` manifest; `peerDependencies` + devDep for pi-coding-agent types. |
| `package-lock.json` | Modified | Lockfile for the approved types-only devDependency install. |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| ExtensionAPI type source = **option-a** (real package types) | Docs (extensions.md:142) name the package as the canonical type source; a hand-rolled shim drifts from a large host API. | Adds `@earendil-works/pi-coding-agent` as types only. |
| Place it in `peerDependencies "*"` + a devDep pin (not plain devDep) | docs/packages.md:169 — pi **bundles** this package; consumers get host-provided types, while the devDep pin lets our own build/CI resolve them. Refines the plan's "devDependency" wording. | Correct resolution contract for published package; type-only (erased), never in runtime `dependencies`. |
| `resolution` param uses `Type.Union` (not `StringEnum`) | `StringEnum` lives in `@earendil-works/pi-ai` — a 2nd runtime dep, which the boundary ("at most ONE types-only devDep") forbids. | Matches existing contract convention; Google-API `StringEnum` migration deferred to Phase 6 (when pi-ai enters for tier-2). |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Type-correctness fix, no behavior change |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** Two minor, in-scope refinements; no scope creep. Plan executed essentially as written.

### Auto-fixed Issues

**1. [Types] `registerTool` generic `TDetails` pinned to `Record<string, unknown>`**
- **Found during:** Task 2 (extension wiring) — initial typecheck failure.
- **Issue:** `execute`'s success and error return branches have different `details` shapes; TS inferred `TDetails` from the first branch and rejected the other.
- **Fix:** `pi.registerTool<typeof WATCH_PARAMS, Record<string, unknown>>({...})` so both branches share one details shape.
- **Files:** `src/watch/extension.ts`.
- **Verification:** `npm run build` + `npm run typecheck` exit 0.
- **Commit:** `155ae19` (part of Task 2).

### Deferred Items

None — plan executed as written.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| `@earendil-works/pi-coding-agent` not in `node_modules` (spike compiled only because `spikes/` is build-excluded) | Resolved by the approved option-a install; type resolves transitively through the package's nested `node_modules` (verified via throwaway tsc probe). |
| This ffmpeg build lacks the `drawtext` filter | Built the e2e test clip from plain colored scenes (red/green/blue) — the colors themselves are the ordered, checkable content. |

## Next Phase Readiness

**Ready:**
- `TierRunner` seam + `defaultRunners` table are stable — Phase 6 swaps `tier1Runner`/`tier2Runner` stubs for real adapters with no orchestrator/extension change.
- `watch` tool registers and runs end-to-end; tier 3 proven against a live model.

**Concerns:**
- **Loadout activation (carry):** the installed `watch` tool must be enabled in any active loadout/profile or a `setActiveTools` governor (e.g. pi-loadout) will strip it (FINDINGS #4). Document the enable step in README/install docs.
- **DOCS carry:** `typebox` sits in `dependencies` though it is a pi-bundled package (docs/packages.md says peer); consider moving to `peerDependencies` in a later cleanup.
- **DAVE carry:** no `.github/workflows/ci.yml` yet (only Socket Security on PRs).
- `resolution` will need `StringEnum` if a Google-compatible provider is targeted (Phase 6).

**Blockers:** None.

---
*Phase: 05-watch-tool-primitive, Plan: 01*
*Completed: 2026-06-19*
