---
phase: 06-tier-adapters
plan: 01
subsystem: watch
tags: [tier-runner, async, transcript, tier-1, watch, orchestrator, escalation]

requires:
  - phase: 05-watch-tool-primitive
    provides: TierRunner seam (walkTierChain + null stubs), extension.ts boundary
  - phase: 04-router
    provides: route()/RoutingDecision tier chain consumed by walkTierChain
  - phase: 02-sampler-data-contract
    provides: WatchedFrameSet (transcript segments + transcriptSource)
provides:
  - Async tier-runner seam (TierRunner returns Promise<TierResult | null>; walkTierChain async)
  - tier1Runner — transcript-passthrough adapter (escalates on no usable transcript)
  - transcriptToToolResultContent — pure tier-1 serializer (question + source lead, mm:ss lines)
affects:
  - 06-tier-adapters (Plan 06-02: tier-2 OpenAI-compatible video HTTP adapter)
  - 07-config-surface (baseURL/model id config that future adapters consume)

tech-stack:
  added: []
  patterns:
    - "Async tier seam: every TierRunner is async; walkTierChain awaits each in chain order"
    - "Tier-1 transcript passthrough: hand transcript text to the orchestrator (mirrors tier-3 frame passthrough)"

key-files:
  created: []
  modified:
    - src/watch/tier-runner.ts
    - src/watch/extension.ts
    - src/watch/index.ts
    - test/watch/tier-runner.test.ts

key-decisions:
  - "Decision: tier-1 = option-a transcript passthrough (local-first, zero deps); orchestrator answers"
  - "Decision: tier seam is async (supersedes Phase-5 sync-seam carry note); extension awaits walkTierChain"

patterns-established:
  - "Pattern: real tier adapters are async; pure tiers resolve immediately, network tiers await I/O"
  - "Pattern: a tier returns null to escalate; the router-supplied chain is walked untouched"

duration: ~35min
started: 2026-06-19T12:20:00Z
completed: 2026-06-19T13:05:00Z
---

# Phase 6 Plan 01: Async Tier Seam + Tier 1 Transcript Adapter Summary

**The tier-runner seam is now asynchronous end-to-end, and tier 1 (transcript) is real: it hands the video's mm:ss-labelled transcript to the orchestrator when one exists, else escalates.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~35 min |
| Started | 2026-06-19T12:20:00Z |
| Completed | 2026-06-19T13:05:00Z |
| Tasks | 3 completed (1 checkpoint + 2 auto) |
| Files modified | 4 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Tier seam is async and preserves walk semantics | Pass | `walkTierChain` returns `Promise<TierResult>`, awaits each runner in chain order, returns first non-null, rejects when no tier resolves; `extension.ts` awaits it. typecheck + build clean. |
| AC-2: Tier 1 escalates when there is no usable transcript | Pass | `tier1Runner` returns `null` when `transcriptSource === "none"` or transcript empty; walk escalates. Two specs (stray-segment + empty). |
| AC-3: Tier 1 answers from the transcript when present | Pass | For a `[1,2,3]` chain with a captions transcript, walk resolves at tier 1; tiers 2/3 not invoked; content carries question + mm:ss lines; `details` has source + segmentCount. |

## Module Execution Reports

### Quality (WALT)
| Metric | Before | After | Delta | Trajectory |
|--------|--------|-------|-------|------------|
| Tests passing | 73 | 77 | +4 | ▲ |
| Typecheck | clean | clean | 0 | ● |
| Build | clean | clean | 0 | ● |
**Overall:** ▲ improved (4 new tier-1 specs; all green)

### Dependencies (DEAN)
| Check | Result |
|-------|--------|
| `npm audit` | 0 vulnerabilities |
| New dependencies | 0 (option-a needs none) |
**Status:** PASS — baseline preserved; honors AGENTS.md "ask first before adding dependencies."

### Advisory (IRIS / RUBY / PETE / OMAR)
- IRIS: async signature change applied uniformly across all runners + walk + extension; error-message text preserved. No flags.
- RUBY: tier-1 serializer mirrors the tier-3 serializer shape; no duplication debt.
- PETE: tier-1 path is pure/in-memory and escalates before any I/O — strictly cheaper than tiers 2/3.
- OMAR: `details` carries `tier` / `transcriptSource` / `segmentCount` for tool-result introspection.

### Documentation (DOCS)
- Module docstrings in `index.ts` and `tier-runner.ts` updated to reflect tier 1 implemented + tier 2 still a seam.
- Phase-5 carry note ("tier runners plug in via sync signature, no extension.ts change") explicitly superseded in STATE Session Continuity and below.

_Dispatch evidence: pre-apply baseline captured; post-apply advisory + enforcement ran; pre-unify produced no blocking action; post-unify recorded below._

## Accomplishments

- Promoted `TierRunner` to `(args) => Promise<TierResult | null>` and made `walkTierChain` async; `extension.ts` awaits it — the load-bearing prerequisite for the tier-2 network adapter (Plan 06-02).
- Implemented `tier1Runner` (transcript passthrough) and a pure `transcriptToToolResultContent` serializer, exported from the watch barrel.
- Grew the suite 73 → 77 with tier-1 escalation + answering specs; converted existing walk specs to async (rejects assertion for the no-result case).

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 2: async seam | `7bf11b6` | refactor | TierRunner/walkTierChain async; extension awaits; tests async |
| Task 3: tier 1 impl | `c687b55` | feat | tier1Runner + transcriptToToolResultContent + barrel export |
| Task 3: tier 1 tests | `6e2a934` | test | escalation (AC-2) + answering (AC-3) + serializer specs |

Task 1 was a `checkpoint:decision` (no commit) — resolved to option-a.
Plan metadata commit: pending (this UNIFY).

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/watch/tier-runner.ts` | Modified | Async `TierRunner`/`walkTierChain`; async tier3 + tier2 stub; real `tier1Runner` + `transcriptToToolResultContent` |
| `src/watch/extension.ts` | Modified | `await walkTierChain(...)` at the effect boundary |
| `src/watch/index.ts` | Modified | Export `transcriptToToolResultContent`; docstring refresh |
| `test/watch/tier-runner.test.ts` | Modified | Async conversion + 4 new tier-1 specs |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Tier 1 = transcript passthrough (option-a) | Cheapest, fully local, model-agnostic (DESIGN §2); no network, no API key, no new dep | Tier 1 defers wording to the orchestrator; no Phase-7 config pulled forward |
| Tier seam becomes async | Tier-2 network I/O is unavoidably async; uniform seam now avoids re-touching walk/extension in 06-02 | Supersedes Phase-5 "sync seam / no extension.ts change" carry note |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | — |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** None — plan executed as written. (Minor: a couple of now-stale module/fixture docstrings were refreshed for accuracy, within planned files.)

### Deferred Items
None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- Async tier seam is stable; Plan 06-02 can drop in the tier-2 OpenAI-compatible video HTTP adapter without re-touching `walkTierChain` or `extension.ts`.
- `toOpenAIContent` (contract) is the proven tier-2 serialization target; tier-2 just needs an HTTP call (Node ≥20 global `fetch`, zero new deps) + null-on-failure escalation.

**Concerns:**
- DAVE: no `.github/workflows/ci.yml` yet (carried from Phase 5) — only Socket Security app checks gate PRs; the UNIFY merge gate has no test/build CI to enforce.
- Tier-1 answering quality depends on the orchestrator; no condensed-summary step in tier 1 itself (accepted under option-a).
- `fetchTranscript` is still a stub returning `none`, so tier 1 only fires once a real caption/Whisper source lands (out of this plan's scope).

**Blockers:**
- None.

---
*Phase: 06-tier-adapters, Plan: 01*
*Completed: 2026-06-19*
