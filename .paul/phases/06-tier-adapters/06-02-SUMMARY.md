---
phase: 06-tier-adapters
plan: 02
subsystem: watch
tags: [tier-2, openai-compatible, video-adapter, fetch, qwen, mlx, image_url, escalation, pure-core]

requires:
  - phase: 06-tier-adapters
    provides: async TierRunner seam (walkTierChain awaits each runner) + tier2Runner stub slot (Plan 06-01)
  - phase: 02-sampler-data-contract
    provides: toOpenAIContent serializer (OpenAI content[] wire shape) + WatchedFrameSet
  - phase: 04-router
    provides: RoutingDecision tier chain consumed by walkTierChain
provides:
  - tier-2 OpenAI-compatible video adapter (src/watch/tier2.ts) wired into defaultRunners[2]
  - pure buildTier2Request / parseTier2Answer (request builder + defensive response parser)
  - resolveTier2ConfigFromEnv — isolated env bridge (WATCH_TIER2_*), the watch module's only env read
  - createTier2Runner({ config?, fetchImpl? }) — injectable factory for deterministic testing
affects:
  - 07-config-surface (replaces the env bridge with a typed baseURL/model/tier-order config)
  - 08-watch-command + 09-batching (consume the now-complete tier 1/2/3 chain)

tech-stack:
  added: []
  patterns:
    - "Adapter = baseURL + model id: one OpenAI-compatible path for local Qwen (mlx_vlm.server) and hosted (Gemini); no per-model forks"
    - "Pure Core, Explicit Effects: pure request-builder + response-parser; the only effects are an isolated env read and an injectable fetch"
    - "Null-to-escalate: network adapter returns null on missing config / non-2xx / network error / empty answer so walkTierChain falls through to tier 3"

key-files:
  created:
    - src/watch/tier2.ts
    - test/watch/tier2.test.ts
  modified:
    - src/watch/tier-runner.ts
    - src/watch/index.ts

key-decisions:
  - "Decision: tier-2 code lives in a new src/watch/tier2.ts (checkpoint option-a), keeping the tier-walk core pure and isolating the module's first network/env effect"
  - "Decision: config via env bridge (WATCH_TIER2_*) only; typed config surface deferred to Phase 7"

patterns-established:
  - "Pattern: effectful tier adapters live in their own module; tier-runner.ts references only their runner factory when building defaultRunners"
  - "Pattern: HTTP adapters are tested with an injected fetchImpl + hand-built fixtures — no live model, no network"

duration: ~20min
started: 2026-06-19T14:37:00Z
completed: 2026-06-19T14:57:00Z
---

# Phase 6 Plan 02: Tier-2 OpenAI-Compatible Video Adapter Summary

**Tier 2 is real: the `watch` tool now POSTs sampled frames as ordered base64 `image_url` blocks + text to any OpenAI-compatible `/v1/chat/completions` endpoint (local Qwen3-VL or hosted), returns the model's answer, and cleanly escalates to tier 3 on missing config or any failure. All three tiers are now implemented.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~20 min |
| Started | 2026-06-19T14:37:00Z |
| Completed | 2026-06-19T14:57:00Z |
| Tasks | 3 (1 checkpoint + 2 auto) |
| Files modified | 4 (2 created, 2 modified) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Tier 2 answers via the OpenAI-compatible endpoint when configured | Pass | `buildTier2Request` targets `<baseURL>/chat/completions`, body carries `toOpenAIContent` image_url+text parts; injected-fetch runner returns `{ tier:2, content, details.tier:2 }`; walk integration resolves at tier 2 without invoking tier 3. |
| AC-2: Tier 2 escalates (returns null) on missing config or any failure | Pass | Runner returns `null` for unconfigured (no fetch call), non-2xx, thrown network error, and empty/garbled answer; walk integration falls through to tier 3 on a 502. Never throws through the host. |
| AC-3: Zero new dependencies; pure core; clean gates | Pass | `package.json`/lock unchanged (Node ≥20 global `fetch`); `buildTier2Request`/`parseTier2Answer` are pure and directly tested; typecheck + build + `npm audit` (0 vulns) all clean. |

## Module Execution Reports

### Quality (WALT)
| Metric | Before | After | Delta | Trajectory |
|--------|--------|-------|-------|------------|
| Tests passing | 77 | 93 | +16 | ▲ |
| Typecheck | clean | clean | 0 | ● |
| Build | clean | clean | 0 | ● |

**Overall:** ▲ improved (16 new tier-2 specs — pure builder/parser, env bridge, injected-fetch runner paths, walk integration; all green).

### Dependencies (DEAN)
| Check | Result |
|-------|--------|
| `npm audit` | 0 vulnerabilities |
| New runtime dependencies | 0 (global `fetch`, no SDK) |

**Status:** PASS — baseline preserved; honors AGENTS.md "ask first before adding dependencies."

### Architecture (ARCH)
- New `tier2.ts` imports only `../contract/index.js` (types + `toOpenAIContent`) and a `./tier-runner.js` type — no cross-layer/upward violation. Effect module sits correctly at the watch boundary; tier-runner.ts stays a pure core.

### Security (SETH)
- API key sourced from env only (`WATCH_TIER2_API_KEY`); `Authorization` header built but never logged; no hardcoded secrets (scan clean). PASS.

### Advisory (RUBY / PETE / OMAR / DOCS / IRIS)
- RUBY: "Extract Pure Core" already satisfied — pure builder/parser split from the fetch/env effects; no debt.
- PETE: tier-2 short-circuits (no fetch when unconfigured); failure → null fallthrough. No explicit `fetch` timeout — noted as a Phase-7 concern, not a regression.
- OMAR: errors are swallowed by design (null-to-escalate); `extension.ts` still surfaces `tier`/`transcriptSource` in `details`.
- DOCS: `tier-runner.ts` + `index.ts` docstrings updated (tier 2 now implemented; effects isolated in tier2.ts). DESIGN unchanged — no drift.
- IRIS: no review markers, no dead code.

_Dispatch evidence: pre-apply WALT baseline (77/77) captured; post-apply advisory + enforcement ran (WALT/DEAN PASS); pre-unify produced no blocking action; post-unify CODI/RUBY/SKIP recorded._

## Accomplishments

- Shipped the tier-2 adapter as a dedicated effect module (`src/watch/tier2.ts`): pure `buildTier2Request` (serializes via the proven `toOpenAIContent` wire shape), pure defensive `parseTier2Answer`, isolated `resolveTier2ConfigFromEnv`, and the injectable `createTier2Runner`.
- Wired `defaultRunners[2]` to the real runner with no change to `extension.ts` or `walkTierChain` — the async seam from 06-01 absorbed it exactly as predicted.
- Completed the tier story: tiers 1 (transcript), 2 (OpenAI-compat video), and 3 (frames-into-context) are all implemented; suite grew 77 → 93.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 2: tier-2 adapter + wire-in | `f5d9b1f` | feat | tier2.ts (builder/parser/env/factory); defaultRunners[2]; docstrings + barrel |
| Task 3: tier-2 specs | `08776b2` | test | 16 deterministic specs (injected fetch); suite 77 → 93 |

Task 1 was a `checkpoint:decision` (no commit) — resolved to **option-a** (new `tier2.ts`).
Plan metadata commit: pending (this UNIFY).

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/watch/tier2.ts` | Created | Tier-2 adapter: pure builder/parser + env bridge + `createTier2Runner` (network/env effect boundary) |
| `test/watch/tier2.test.ts` | Created | 16 specs: pure builder/parser, env bridge, injected-fetch runner paths, walk integration |
| `src/watch/tier-runner.ts` | Modified | `defaultRunners[2]` = `createTier2Runner()`; `tier2Runner` re-exported; docstring refresh (tier 2 implemented, effects isolated) |
| `src/watch/index.ts` | Modified | Export tier-2 surface (`createTier2Runner`, `buildTier2Request`, `parseTier2Answer`, `resolveTier2ConfigFromEnv`, `Tier2Config`); module docstring refresh |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Tier-2 code in a new `src/watch/tier2.ts` (option-a) | Keeps the tier-walk core pure/pi-free; isolates the module's first network+env effect; mirrors the project's one-concern split (serialize.ts/route.ts); cleanest Phase-7 config seam (AGENTS.md "effects near boundaries") | Diverges from the 06-01 handoff's literal "edit tier-runner.ts" wording; tier-runner.ts imports the runner factory (a table wiring, not an effect) |
| Config via env bridge (`WATCH_TIER2_*`) only | Phase 7 owns the real config surface; env read isolated in one function so it can be swapped without touching the adapter | No Phase-7 config pulled forward; no committed secrets |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | — |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** None — plan executed as written; checkpoint resolved to option-a as recommended.

### Deferred Items
None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- All three tiers implemented; the `watch` chain (transcript → OpenAI-compat video → frames) is end-to-end real.
- Phase 7 (config surface) has a clean seam: replace `resolveTier2ConfigFromEnv` with a typed config (baseURL/model/tier order/frame budget/resolution thresholds) — the adapter signature already takes a `Tier2Config`.

**Concerns:**
- DAVE: still no `.github/workflows/ci.yml` (carried from Phase 5) — the merge gate has only Socket Security, no test/build CI to enforce. Recommend addressing in Phase 7.
- No explicit `fetch` timeout/abort on the tier-2 call; a slow endpoint blocks until the runtime default. Fold an `AbortSignal` timeout into the Phase-7 config.
- Tier-2 answering is only live once an endpoint is configured (env unset by default → escalates to tier 3); end-to-end against a real `mlx_vlm.server` is unverified in CI (covered by DESIGN §5 #2 spike).

**Blockers:**
- None.

---
*Phase: 06-tier-adapters, Plan: 02*
*Completed: 2026-06-19*
