---
phase: 04-router
plan: 01
subsystem: router
tags: [router, tier-selection, escalation-chain, question-classification, on-screen-text, ocr, resolution-policy, pure-core, deterministic, watched-frame-set, vitest, local-first, DESIGN-§2]

requires:
  - phase: 02-sampler-data-contract
    provides: WatchedFrameSet + ResolutionTier + TranscriptSegment/transcriptSource contract types (imported as types only)
  - phase: 03-sampler-implementation
    provides: sample() — the validator-guaranteed surface the router routes over (consumed by type/shape; sampler untouched)
provides:
  - classifyQuestion — pure question → { intent (spoken/visual/on-screen-text), resolution } with on-screen-text precedence
  - route — pure { question, context } → RoutingDecision (intent, resolution, ordered tier chain, primaryTier, rationale)
  - routeContextFromSet — pure WatchedFrameSet → RouteContext (hasTranscript) seam
  - Tier / QuestionIntent / RouteContext / RoutingDecision public types
affects:
  - 05-watch-tool-primitive (wires ref + question → sample() → route() → walks the tier chain → answer)
  - 06-tier-adapters (tier 1/2/3 adapters keyed by the chain route() produces)
  - 07-config-surface (tier order/enablement, budget, resolution thresholds become user config over this fixed policy)

tech-stack:
  added: []
  patterns:
    - "Pure Core, Explicit Effects: router is a zero-side-effect decision module (no I/O, no spawns, no Date/Math.random); mirrors the sampler's pure core"
    - "Route, don't answer: router returns an ordered escalation chain (decision); execution/confidence-escalation belongs to the watch tool (Phase 5)"
    - "Tier discipline encoded as policy: cheapest tier that works; every chain non-empty and terminates in tier 3 (universal fallback)"
    - "Keyword precedence classification: on-screen-text checked before spoken before visual default (OCR phrasing embeds spoken keywords)"
    - "WatchedFrameSet → RouteContext adapter (routeContextFromSet) keeps route() testable with hand-built contexts while still routing over real sampler output"
    - "Assert routes, not answers: deterministic route assertions independent of any probabilistic model call (PRD testing strategy)"

key-files:
  created:
    - src/router/route.ts
    - src/router/index.ts
    - test/router/route.test.ts
  modified: []

key-decisions:
  - "Decision: router emits an ordered tier chain (a decision), not an answer; the watch tool walks it and owns confidence-based escalation"
  - "Decision: on-screen-text intent is matched before spoken (precedence) so OCR phrasing like 'what does the sign say' triggers the high-res path"
  - "Decision: RouteContext is minimal (hasTranscript only) and derived via routeContextFromSet; richer signals are additive later without changing route()'s shape"
  - "Decision: keep router internal (no package.json main change) — Phase 5 wires it; v0.1 uses a fixed policy, config surface is Phase 7"

patterns-established:
  - "Pattern: each new subsystem is a pure module under src/<name>/ with an index.ts public surface, importing contract types one-way (no reverse deps)"
  - "Pattern: the router never imports the sampler/effects; it routes over the WatchedFrameSet *shape*, decoupling decision from production"

duration: ~2min
started: 2026-06-18T18:26:16Z
completed: 2026-06-18T18:28:00Z
---

# Phase 04 Plan 01: Router — Pure Tier-Selection Decision Unit Summary

**Shipped the router as its own pure, deterministically-tested decision unit (DESIGN §2): `classifyQuestion` + `route` + `routeContextFromSet` turn a question + transcript-availability context into an ordered tier escalation chain (spoken+transcript → [1,2,3]; spoken-no-transcript / visual / on-screen-text → [2,3]) with the high-res path for on-screen-text and tier 3 always terminal. Zero side effects, 16 new route-asserting specs, suite 48→64 green, 0 vulnerabilities, no new dependencies; contract + sampler untouched.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~2 min |
| Started | 2026-06-18T18:26:16Z |
| Completed | 2026-06-18T18:28:00Z |
| Tasks | 2 completed |
| Files modified | 3 (3 created, 0 modified) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: spoken + transcript → tier 1 first | Pass | `route()` on a "what does the narrator say" question with `hasTranscript:true` → `primaryTier===1`, `tiers===[1,2,3]`, `resolution==="low"`. |
| AC-2: spoken + no transcript → escalate past tier 1 | Pass | `hasTranscript:false` → `tiers===[2,3]`, `tiers[0]!==1`. `routeContextFromSet` maps empty/`"none"` → `hasTranscript:false`, segments+`"captions"` → `true`, and `"none"` source overrides stray segments → `false`. |
| AC-3: temporal/visual → [2,3], tier 3 terminal | Pass | "What color comes after red?" under both transcript states → `tiers===[2,3]`, last element `3`, `resolution==="low"`. |
| AC-4: on-screen-text → high-res path | Pass | "What does the sign say?" → `intent==="on-screen-text"`, `resolution==="high"`, `tiers===[2,3]`. Precedence covered: "sign say" / "label say" classify as on-screen-text despite the embedded spoken keyword "say". |
| AC-5: pure & deterministic | Pass | Identical inputs → identical decisions (`toEqual`); every chain in a 7-case table is non-empty and ends in tier 3; `route()` runs on a frozen args/context without throwing or mutating; `classifyQuestion` is context-independent. |

## Module Execution Reports

Registry: `modules.yaml` loaded (kernel_version 2.0.0).

### Pre-apply
- **WALT** (p100): baseline captured — `npm test` = 48 passed / 0 failing (5 files), exit 0. `test_baseline` set.
- **TODD** (p50): PLAN `type: execute`, no RED-first task → **skipped — no TDD enforcement for this scope**.

### Test Execution
| Task | Commit | Status |
|------|--------|--------|
| Task 1: pure router | `502d5ec` | ✓ typecheck exit 0 (real `tsc -p tsconfig.test.json`, empty output) |
| Task 2: route specs | `21c00c5` | ✓ `vitest run` → 64/64 (48 baseline + 16 new); typecheck exit 0 |

### Quality
| Metric | Before | After | Delta | Trajectory |
|--------|--------|-------|-------|------------|
| Tests passing | 48 | 64 | +16 | ▲ |
| Typecheck (tsconfig.test) | exit 0 | exit 0 | — | ● |
| Vulnerabilities (npm audit) | 0 | 0 | 0 | ● |
**Overall:** ▲ improved (+16 route-asserting specs; pure decision subsystem added with zero new deps)

### Post-apply (advisory)
- **ARCH** (p125): new `src/router/` layer imports one-way into `src/contract/*` (types only); contract/sampler never import router. Pure decision core, no side-effect deps, no god-file (`route.ts` 177L), no cycle. No findings.
- **SETH** (p130): pure module — no spawns, no `exec`, no `ref` handling, no secret-like literals. No findings.
- **PETE** (p175): `classifyQuestion` = bounded keyword scan over the question string; `route` = constant-time. No perf concern.
- **IRIS** (p250): no review markers, no dead/commented code. No concerns.
- **REED** (p180) / **OMAR** (p170): no I/O, timeouts, retries, logging, or catch surface — pure logic. SKIP.
- **DOCS** (p250): changed source maps to DESIGN.md §2 (tiered router, already documented); no README → NO_DOC, non-blocking.
- **GABE / LUKE / ARIA / DANA / VERA**: no API / UI / a11y / data / PII surface — SKIP.
- **DAVE** (p175): no CI config changed; `.github/workflows/` still absent — advisory carry (recommend `ci.yml`; separate change).

### Post-apply (enforcement)
- **WALT** (p100): re-ran tests → 64/64 pass (baseline 48 → +16); typecheck exit 0. **PASS**.
- **TODD** (p200): full suite green; no unresolved regressions. **PASS**.
- **DEAN** (p150): `npm audit` → 0 vulnerabilities; no new dependencies (`package.json`/lock unchanged). **PASS**.

### Pre-unify / Post-unify
- `[dispatch] pre-unify: 0 modules registered for this hook`
- **CODI** (p220) post-unify: row appended to `.paul/CODI-HISTORY.md`.
- **WALT** (p100) post-unify: row appended to `.paul/QUALITY-HISTORY.md` — Tests 48→64, verdict ▲ improved (+16).
- **RUBY** (p300) post-unify: changed files measured; largest `route.ts` 177 lines; no god-files, no debt patterns; pure decision module. No technical debt concerns.
- **SKIP** (p200) post-unify: knowledge entry recorded — "route, don't answer" (router emits an ordered tier chain; the watch tool walks it + owns confidence escalation) and on-screen-text-before-spoken classification precedence (source: Decisions).

## Accomplishments

- Built the **router** — the load-bearing "pick the cheapest tier that works" decision the PRD flagged as the actual un-de-risked hard part — as a pure, deterministically-tested unit with its own deterministic test surface, independent of any probabilistic model output.
- Encoded **tier discipline** (AGENTS.md) directly: every route is a non-empty ordered escalation chain that terminates in tier 3 (universal fallback), with tier 1 only chosen when a transcript is actually available.
- Implemented the **high-res / OCR path** via on-screen-text intent precedence, so OCR-style phrasing ("what does the sign say") triggers `resolution:"high"` even though it embeds a spoken keyword.
- Added the **`routeContextFromSet` seam** that lets the router route over the real `WatchedFrameSet` `sample()` produces while keeping `route()` unit-testable with hand-built contexts — decoupling the decision from frame production.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: pure router | `502d5ec` | feat | `route.ts` (`classifyQuestion`/`route`/`routeContextFromSet` + types) + `index.ts` public surface |
| Task 2: route specs | `21c00c5` | test | 16 deterministic route assertions (AC-1..AC-5); suite 48→64 |

Plan metadata: committed with UNIFY (this SUMMARY + STATE + ROADMAP + PLAN).

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/router/route.ts` | Created | Pure router: intent classification (precedence-ordered keywords), tier-selection policy, escalation chain, `routeContextFromSet` adapter |
| `src/router/index.ts` | Created | Router subsystem public surface (re-exports `route`/`classifyQuestion`/`routeContextFromSet` + types) |
| `test/router/route.test.ts` | Created | Deterministic route assertions — AC-1..AC-5 (tier selection, classification precedence, context mapping, purity/invariants) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Router emits an ordered tier chain (a decision), not an answer | Separates "which path" (pure, testable) from "run the path + decide if it worked" (effectful, model-dependent); PRD: treat routing as its own design + test surface | Phase 5 watch tool walks the chain and owns confidence-based escalation; Phase 6 adapters key off the chain |
| On-screen-text intent matched before spoken (precedence) | OCR phrasing ("read the sign", "what does the label say") embeds spoken keywords; the high-res path must win | Deterministic, covered by a precedence spec; richer classification is an additive later refinement |
| `RouteContext` minimal (`hasTranscript` only), derived via `routeContextFromSet` | Keep the tier decision dependent on a small, explicit signal; keep `route()` testable without a full WatchedFrameSet | New routing signals can be added to the context without breaking the route() contract |
| Keep router internal; fixed v0.1 policy | Phase 5 wires activation; user config (tier order/enablement, budget, resolution thresholds) is Phase 7 | No package.json `main` change; config surface lands later over the same policy |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | — |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** None. Plan executed exactly as written. Both tasks PASS, all 5 ACs met, scope clean (only the three planned files changed, +400 lines), boundaries honored (contract + sampler imported as types only, untouched), no new dependencies.

### Deferred Items
None — plan executed exactly as written. (Escalation *execution*, confidence-based re-routing, tier adapters, and user config were explicit out-of-scope items for later phases, not deferrals of this plan.)

## Issues Encountered

None. Typecheck and the full suite passed on first run; output was read back from redirected files to confirm real exit codes (per the 03-02 bash-wrapper caveat).

## Next Phase Readiness

**Ready:**
- `route()` is the stable decision surface Phase 5 (`watch` tool) wraps: `sample()` → `routeContextFromSet()` → `route()` → walk `tiers` → answer.
- Tier chain + resolution decision are deterministic and fully asserted, so Phase 6 tier adapters can be built/tested against fixed routes without a live model.

**Concerns:**
- Question classification is intentionally simple keyword/precedence matching for v0.1; real-world questions may need tuning — revisit when wiring representative golden-clip questions in Phase 5/6.
- `hasTranscript` is the only routing signal today; transcript is still "none" until a real caption/Whisper plan lands, so the spoken+transcript→tier-1 path is exercised by fixtures, not yet by live sampler output.
- DAVE advisory carry: no CI workflow yet — `npm test`/typecheck not enforced on PRs (only Socket Security). Recommend `.github/workflows/ci.yml` as a separate change.

**Blockers:**
- None.

---
*Phase: 04-router, Plan: 01*
*Completed: 2026-06-18*
