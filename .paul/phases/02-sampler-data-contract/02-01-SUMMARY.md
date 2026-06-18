---
phase: 02-sampler-data-contract
plan: 01
subsystem: contract
tags: [watched-frame-set, sampler, openai-content, typebox, vitest, serialization, data-contract, tier-neutral]

requires:
  - phase: 01-tool-activation-spike
    provides: proven OpenAI content[] wire shape (base64 image_url + text) from qwen-video spike; in-ecosystem dep style (typebox)
provides:
  - WatchedFrameSet in-memory type family (frames + transcript + source metadata on one shared timeline)
  - validateWatchedFrameSet pure validator (schema + cross-field invariants)
  - toOpenAIContent pure serializer to OpenAI content[] wire shape
  - first production TS toolchain (package.json, tsconfig + tsconfig.test, vitest)
affects:
  - 03-sampler-implementation (produces WatchedFrameSet)
  - 04-router (consumes contract for tier routing)
  - tier adapters (tier 2/3 consume toOpenAIContent output)

tech-stack:
  added: [typebox@^1.2.16, vitest@^4.1.9, typescript@^5.7.0, "@types/node@^22.10.0"]
  patterns:
    - "TypeBox single-source schemas: one schema yields static type (Static<>) + runtime validator"
    - "Tier-neutral core contract; OpenAI-specific serialization isolated in serialize.ts"
    - "Pure functions for validation + serialization (no I/O, no mutation)"
    - "Deterministic fixture tests (no live model calls) per PRD Testing Strategy"
    - "Split tsconfig: build emits src->dist/contract; tsconfig.test.json typechecks src+test"

key-files:
  created:
    - src/contract/watched-frame-set.ts
    - src/contract/serialize.ts
    - src/contract/index.ts
    - test/contract/watched-frame-set.test.ts
    - package.json
    - tsconfig.json
    - tsconfig.test.json
    - vitest.config.ts
  modified:
    - .gitignore

key-decisions:
  - "Decision: Vitest + TypeBox toolchain (checkpoint:decision)"
  - "Decision: vitest pinned ^4.1.9 to clear a critical/high dev-server advisory chain"
  - "Decision: tier-neutral contract; OpenAI shapes live only in serialize.ts"

patterns-established:
  - "Pattern: define each contract shape once as a TypeBox schema; export both const schema and Static<> type"
  - "Pattern: cross-field invariants (ordering, counts, time monotonicity) enforced in a pure validator, not the schema"
  - "Pattern: timeline serialization emits mm:ss text adjacent to each image; frame-before-transcript on offset ties"

duration: ~25min
started: 2026-06-18T17:51:00Z
completed: 2026-06-18T18:02:00Z
---

# Phase 02 Plan 01: Sampler Data Contract Summary

**Shipped the tier-neutral `WatchedFrameSet` data contract (TypeBox schemas + pure invariant validator) and a pure `toOpenAIContent()` serializer to the proven OpenAI `content[]` wire shape, on the project's first production TypeScript toolchain — 12 deterministic tests passing, 0 vulnerabilities.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~25 min |
| Started | 2026-06-18T17:51:00Z |
| Completed | 2026-06-18T18:02:00Z |
| Tasks | 3 completed (+ 1 checkpoint resolved) |
| Files modified | 1 modified, 8 created (+ lockfile) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Project builds and tests run | Pass | `npm run typecheck` exit 0; `npm test` runs 12 tests |
| AC-2: WatchedFrameSet captures one shared timeline | Pass | Type compiles; validator accepts well-formed value, rejects out-of-order/negative times with clear errors |
| AC-3: Serialization matches proven OpenAI wire shape | Pass | `toOpenAIContent` emits ordered interleaved text + base64 `image_url` data URLs in timeline order with adjacent mm:ss labels |
| AC-4: Contract fields cover DESIGN §6 / PRD line 42 | Pass | base64 image + resolution tier, mm:ss timestamp, aligned transcript segments, source metadata (duration, fpsSampled, origin scene-cut/backfill) all present |

## Module Execution Reports

Registry: `modules.yaml` loaded (kernel_version 2.0.0).

### Pre-apply
- **TODD** (p50): SKIPPED — plan `type: execute`, no RED/test-first task declared. No TDD enforcement for this scope.
- **WALT** (p100): SKIPPED at pre-apply — no test runner existed yet (greenfield); `test_baseline = none`.

### Post-task
- **TODD** post-task: SKIPPED — no TDD task.

### Post-apply (advisory)
- **ARCH**: clean feature module (`src/contract/`); no boundary violation.
- **DANA**: data-shape contract with runtime validator + invariants; no migration risk.
- **DOCS**: changed source maps to DESIGN.md §6 / PRD line 42 (already describe the contract); no README yet → NO_DOC (non-blocking).
- **IRIS**: no review markers; clean.
- **SETH / VERA**: no secrets, no PII (synthetic base64 fixtures); pure transform.
- **OMAR / REED / PETE / GABE / LUKE / ARIA**: no logging/resilience/perf/API/UI surface (only an O(n log n) sort).
- **SKIP**: knowledge candidates recorded — toolchain decision; vitest advisory bump.
- **CODI**: SKIPPED — codegraph unavailable (first production code).

### Post-apply (enforcement)
- **WALT**: ran `npm test` → 12/12 pass; baseline established (was none). **PASS**
- **TODD**: tests added + passing, no regression. **PASS**
- **DEAN**: `npm audit` → **0 vulnerabilities** (after vitest bump). **PASS**

### Pre-unify / Post-unify
- `[dispatch] pre-unify: 0 modules registered for this hook`
- `[dispatch] post-unify: 0 modules registered for this hook`

## Accomplishments

- Defined `WatchedFrameSet` — the load-bearing, tier-neutral seam every tier plugs into (DESIGN.md §6) — as TypeBox schemas yielding both static types and runtime validation.
- Implemented `validateWatchedFrameSet`: a pure validator enforcing frame tMs ordering, transcript startMs ordering, `endMs >= startMs`, and `frameCount === frames.length`.
- Implemented `toOpenAIContent`: a pure serializer to the OpenAI `content[]` wire shape proven by the spikes (interleaved text + base64 `image_url`), keeping all OpenAI specifics out of the core contract.
- Bootstrapped the first production TS toolchain (Vitest + TypeBox) with strict tsconfig and 12 deterministic fixture tests; `npm audit` clean.

## Task Commits

Single squash-style feature commit on `feature/02-sampler-data-contract`:

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Checkpoint + Tasks 1–3 | `8037b68` | feat | Scaffolding + contract + validator + serializer + tests |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/contract/watched-frame-set.ts` | Created | Tier-neutral type family + pure `validateWatchedFrameSet` |
| `src/contract/serialize.ts` | Created | Pure `toOpenAIContent()` → OpenAI `content[]` shape |
| `src/contract/index.ts` | Created | Public surface re-exports |
| `test/contract/watched-frame-set.test.ts` | Created | 12 deterministic validation + serialization tests |
| `package.json` | Created | Scripts (build/typecheck/test) + approved deps |
| `tsconfig.json` | Created | Strict build config (emits `src` → `dist/contract`) |
| `tsconfig.test.json` | Created | Full src+test typecheck (deviation) |
| `vitest.config.ts` | Created | Vitest node config |
| `.gitignore` | Modified | Ignore `dist/` + throwaway spike report JSONs |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Vitest + TypeBox toolchain | TypeBox matches Phase-1 spike; one schema → type + runtime validation; Vitest TS-native + CI-friendly | Sets test/build baseline for all later phases |
| Tier-neutral core; OpenAI shapes only in `serialize.ts` | Keeps the contract reusable by all tiers without leaking wire-format concerns | Tiers 1/2/3 share one in-memory representation |
| Pin vitest `^4.1.9` | Clears a critical/high esbuild/vite dev-server advisory chain | `npm audit` clean → unblocks github-flow CI/DEAN gate |
| Frame-before-transcript on offset ties | Image + mm:ss label precede spoken text at same offset | Stable, deterministic serialization for tests + models |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Essential; no scope creep |
| Scope additions | 1 | Minor config file (tsconfig.test.json) |
| Deferred | 0 | — |

**Total impact:** Minor, all in service of passing the verification + CI gate. No functional scope creep.

### Auto-fixed Issues

**1. [dependency] vitest advisory chain**
- **Found during:** Task 1 (`npm install`)
- **Issue:** Planned vitest `^2.1.0` pulled esbuild/vite with a critical/high dev-server advisory chain (5 vulns).
- **Fix:** Bumped vitest to `^4.1.9`.
- **Files:** `package.json`, `package-lock.json`
- **Verification:** `npm audit` → 0 vulnerabilities.
- **Commit:** `8037b68`

**2. [api] TypeBox v1 error field**
- **Found during:** Task 2 (typecheck)
- **Issue:** Used `error.path`; TypeBox v1 error objects expose `instancePath` (Ajv-style).
- **Fix:** Switched validator to `e.instancePath`.
- **Files:** `src/contract/watched-frame-set.ts`
- **Verification:** `npm run typecheck` exit 0.
- **Commit:** `8037b68`

### Scope Additions

- **`tsconfig.test.json`** added so the build config emits `src` → `dist/contract` (matching `package.json` `main`/`types`) while a separate config typechecks `src` + `test`. Original single tsconfig emitted to `dist/src/contract` and pulled tests into the build. Non-functional config refinement.

### Deferred Items

None — plan executed as written aside from the above.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| One test assertion expected `[02:00]` for a 2000 ms offset | Serializer correct (2000 ms = `00:02`); fixed the test expectation |
| Bash output intermittently shadowed by a `tsc`/build wrapper banner | Used `npm run` scripts (reliable) + `ls` ground-truth on `dist/` to confirm real tsc emit |

## Next Phase Readiness

**Ready:**
- `WatchedFrameSet` + validator + serializer are the stable seam for Phase 3 (sampler implementation) to produce and Phase 4 (router) / tier adapters to consume.
- Toolchain (typecheck/test/build) + deterministic fixture pattern established for all later phases.

**Concerns:**
- `toOpenAIContent` ordering/labelling will need revalidation against a real mlx_vlm.server round-trip in the tier-2 phase (current proof is the fixture + spike).
- Resolution policy (low/high) is captured as data but not yet exercised by any OCR/high-res path.

**Blockers:**
- None.

---
*Phase: 02-sampler-data-contract, Plan: 01*
*Completed: 2026-06-18*
