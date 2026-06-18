---
phase: 03-sampler-implementation
plan: 01
subsystem: sampler
tags: [sampler, frame-selection, scene-cut, backfill, budget-cap, transcript-merge, watched-frame-set, pure-core, tdd, vitest, deterministic]

requires:
  - phase: 02-sampler-data-contract
    provides: WatchedFrameSet type family + validateWatchedFrameSet + FrameOrigin/TranscriptSegment/MediaType/ResolutionTier/SourceMetadata/TranscriptSource contract types
provides:
  - selectFrameTimes — pure budget-capped frame-time selection (scene-cut + gap-gated uniform backfill + uniform subsample)
  - assembleWatchedFrameSet — pure assembly of a validated WatchedFrameSet from selected times + images + transcript + metadata
  - mergeTranscript — pure transcript normalization (drop-empty, clamp, order) onto the shared timeline
  - formatTimestamp — mm:ss / h:mm:ss formatter consistent with serialize.ts
  - src/sampler public surface (index.ts)
affects:
  - 03-sampler-implementation (03-02 consumes this core behind the ffmpeg/ffprobe/transcript-fetch effect boundary)
  - 04-router (routes over the WatchedFrameSet this core produces)
  - 05-watch-tool-primitive (sample() entry point wraps selection + assembly)

tech-stack:
  added: []
  patterns:
    - "Pure decision core: selection/budget logic isolated from all I/O; effects deferred to 03-02"
    - "Gap-gated cadence-aware backfill: grid step = lower-median inter-cut gap (>=2 cuts) or durationMs/budget (0/1 cuts)"
    - "Budget cap via uniform subsample (round(i*(n-1)/(budget-1))), never first-N truncation"
    - "Replicate serialize.ts mm:ss format locally rather than export a private helper (frozen contract boundary)"
    - "Deterministic fixture tests asserting exact frame counts / timestamps / origins (PRD Testing Strategy)"

key-files:
  created:
    - src/sampler/select-frames.ts
    - src/sampler/assemble.ts
    - src/sampler/index.ts
    - test/sampler/select-frames.test.ts
    - test/sampler/assemble.test.ts
  modified: []

key-decisions:
  - "Decision: gap-gated cadence-aware backfill (not fill-to-budget) to satisfy both the dense-clip no-backfill and sparse-clip fill examples"
  - "Decision: budget cap subsamples scene cuts uniformly, preserving temporal spread, never truncates to first-N"
  - "Decision: extract named exported FrameImage interface instead of the plan's inline image tuple type"

patterns-established:
  - "Pattern: sampler core functions are pure (no I/O, no input mutation, no randomness) and deterministic — asserted with explicit purity tests"
  - "Pattern: assembly's real acceptance signal is validateWatchedFrameSet(result).ok === true, not field-by-field checks alone"

duration: ~6min
started: 2026-06-18T16:09:15Z
completed: 2026-06-18T16:14:42Z
---

# Phase 03 Plan 01: Sampler Core (Frame Selection + Assembly) Summary

**Shipped the deterministic, pure heart of the sampler — `selectFrameTimes` (scene-cut selection + gap-gated uniform backfill + budget cap via uniform subsample) and `assembleWatchedFrameSet`/`mergeTranscript` producing values that pass the Phase 2 `validateWatchedFrameSet` — with 26 new deterministic specs (RED→GREEN→REFACTOR), 38/38 suite green, 0 vulnerabilities, no new dependencies.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~6 min |
| Started | 2026-06-18T16:09:15Z |
| Completed | 2026-06-18T16:14:42Z |
| Tasks | 3 completed |
| Files modified | 5 created |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Scene cuts selected as frames within budget | Pass | Cuts kept as `scene-cut`, ordered tMs-ascending, deduped, in `[0, durationMs)`; normalization test covers unsorted/dupe/out-of-range input |
| AC-2: Uniform backfill covers gaps when cuts are sparse | Pass | Sparse `[0]`/10s/5 → `[0,2000,4000,6000,8000]`; cadence-gated case fills only the long static tail (no clustering); empty cuts → uniform grid |
| AC-3: Frame budget always enforced | Pass | `length <= budget` for budgets 0/1/2/3/5/8/16; cuts>budget uniformly subsampled to indices 0,3,6,9 (not first-4); budget 0 → `[]`, budget 1 → single earliest cut |
| AC-4: Assembly produces a valid WatchedFrameSet on one timeline | Pass | `validateWatchedFrameSet(result).ok === true`; sequential zero-based indices, mm:ss timestamps from tMs, supplied resolution tier; `frameCount === frames.length`; `transcriptSource` "captions"/"none" |
| AC-5: Transcript merges onto the shared timeline deterministically | Pass | Ordered by startMs; endMs clamped to `[startMs, durationMs]`; empty/whitespace dropped; merged set accepted by validator |

## Module Execution Reports

Registry: `modules.yaml` loaded (kernel_version 2.0.0).

### Pre-apply
- **WALT** (p100): baseline captured — `npm test` = 12 passed / 0 failing (1 file). `test_baseline` set.
- **TODD** (p50): PLAN `type: tdd`; Task 1 is RED-first → RED-before-GREEN order verified. **PASS** (no block).

### Test Execution (TDD)
| Phase | Commit | Status |
|-------|--------|--------|
| RED | `c86d97d` | ✓ Specs fail — `src/sampler/*` missing (modules not implemented) |
| GREEN (select) | `186016d` | ✓ 12/12 select-frames specs pass |
| GREEN+REFACTOR (assemble) | `cd83265` | ✓ 26/26 sampler specs pass; assembled values pass validateWatchedFrameSet |

### Post-task
- **TODD** post-task ×3: tests run after each task, no regression vs baseline. **PASS** each.

### Post-apply (advisory)
- **ARCH** (p125): new `src/sampler/` feature module imports only from `../contract` (same-package internal) — no boundary violation; pure core, effects deferred to 03-02; functional-first aligned; no god-files (largest 126 lines). No findings.
- **SETH** (p130): no secret-like literals, no dangerous sinks; pure arithmetic over synthetic fixtures. No findings.
- **IRIS** (p250): no review markers, no dead code/empty catches. No concerns.
- **DOCS** (p250): changed source maps to DESIGN.md §3 / PRD Testing Strategy (already describe the sampler); no README → NO_DOC, non-blocking.
- **DAVE** (p175): no CI config files changed; `.github/workflows/` still absent — advisory carry (recommend `ci.yml`; separate change, out of plan scope).
- **PETE** (p175): only O(n log n) sorts over small in-memory arrays. No perf concern.
- **GABE / LUKE / ARIA / DANA / OMAR / REED / VERA**: no API / UI / a11y / data-migration / observability / resilience / privacy surface — SKIP.
- **SKIP** (p300): knowledge candidate recorded — gap-gated cadence-aware backfill rule; uniform-subsample budget cap. (See Decisions.)

### Post-apply (enforcement)
- **WALT** (p100): re-ran tests → 38/38 pass (baseline 12 → +26 new, 0 failing); typecheck exit 0. **PASS**.
- **TODD** (p200): full suite green; RED→GREEN→REFACTOR honored; no unresolved regressions. **PASS**.
- **DEAN** (p150): `npm audit` → 0 vulnerabilities; no new dependencies. **PASS**.

### Pre-unify / Post-unify
- `[dispatch] pre-unify: 0 modules registered for this hook`
- **CODI** (p220) post-unify: appended 03-01 row to `.paul/CODI-HISTORY.md` — outcome `injected`, R=0 / U=3 / K=0 (pre-plan probed validateWatchedFrameSet [resolved-empty] + WatchedFrameSet/TranscriptSegment/FrameOrigin [unresolved]; no call-sites), blast_radius=n.
- **WALT** (p100) post-unify: appended 03-01 row to `.paul/QUALITY-HISTORY.md` — Tests 12→38 pass, typecheck exit 0, verdict ▲ improved (+26).
- **RUBY** (p300) post-unify: changed files measured (largest `assemble.ts` 141 lines, `select-frames.ts` 126); no god-files, no debt patterns, pure functions. No technical debt concerns.
- **SKIP** (p200) post-unify: knowledge entry recorded — gap-gated cadence-aware backfill + uniform-subsample budget cap (source: this SUMMARY → Decisions).

## Accomplishments

- Implemented `selectFrameTimes` — the load-bearing *decision* layer that chooses which moments the model ever sees and enforces the ~16-frame budget guardrail (PRD Risks), fully pure and deterministic.
- Designed a **gap-gated, cadence-aware backfill** that resolves the apparent contradiction in the plan's examples (dense well-covered clip stays at its scene cuts; sparse/long-static clips get uniform fill), honoring AC-2's "largest uncovered gaps / no clustering."
- Implemented `assembleWatchedFrameSet` + `mergeTranscript` + `formatTimestamp`, producing only `WatchedFrameSet` values that pass the Phase 2 validator — the real acceptance signal.
- Added 26 deterministic specs asserting exact frame counts, timestamps, and scene-cut-vs-backfill origins per the PRD Testing Strategy; 38/38 total suite green.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: failing sampler specs (RED) | `c86d97d` | test | 26 deterministic select-frames + assemble specs; fail on missing modules |
| Task 2: frame-selection algorithm (GREEN) | `186016d` | feat | `selectFrameTimes` + minimal index surface; AC-1/2/3 |
| Task 3: transcript merge + assembly + surface (GREEN+REFACTOR) | `cd83265` | feat | `assemble.ts` (formatTimestamp/mergeTranscript/assembleWatchedFrameSet) + full index; AC-4/5 |

Plan metadata: committed with UNIFY (this SUMMARY + STATE + ROADMAP).

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/sampler/select-frames.ts` | Created | Pure `selectFrameTimes()` — normalize cuts, scene-cut selection, gap-gated backfill, budget cap |
| `src/sampler/assemble.ts` | Created | Pure `formatTimestamp` + `mergeTranscript` + `assembleWatchedFrameSet` (+ `FrameImage`/`AssembleInput`) |
| `src/sampler/index.ts` | Created | Public sampler surface re-exports |
| `test/sampler/select-frames.test.ts` | Created | 12 deterministic selection specs (AC-1/2/3) |
| `test/sampler/assemble.test.ts` | Created | 14 deterministic assembly + transcript specs (AC-4/5) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Gap-gated, cadence-aware backfill (grid step = lower-median inter-cut gap for ≥2 cuts; `durationMs/budget` for 0/1 cuts) | The plan's own examples require dense well-covered clips (budget 16, 3 evenly-spaced cuts) to stay at 3 frames while sparse clips fill — a flat "fill-to-budget" rule can't do both. Cadence gating subdivides only stretches longer than the typical scene cadence. | Satisfies AC-2 "largest uncovered gaps / no clustering"; 03-02 feeds real ffmpeg scene cuts into the same rule |
| Budget cap via uniform subsample `round(i*(n-1)/(budget-1))` (dedupe indices) | Preserves temporal spread when scene cuts exceed budget; explicitly NOT first-N truncation (AC-3) | Deterministic, spread-preserving downsample of dense scene-cut lists |
| Extract named exported `FrameImage` interface | Plan used an inline `{imageBase64; mediaType}[]` tuple; a named export is clearer and reusable by 03-02's decode step | Minor, functionally equivalent; widens the public surface by one type |
| Replicate `serialize.ts` mm:ss logic in `formatTimestamp` | serialize.ts is frozen this plan and keeps `formatMs` private; replication keeps timestamp format consistent without touching the contract | One small intentional duplication, documented in-code; revisit if a shared time util emerges |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | — |
| Scope additions | 1 | Minor: named `FrameImage` interface vs inline tuple (functionally equivalent) |
| Deferred | 0 | — |

**Total impact:** Negligible. Plan executed as written; the one refinement is a naming/clarity choice within the planned `AssembleInput` shape. No functional scope creep, no new dependencies, no boundary violations (src/contract untouched, serialize.ts untouched).

### Deferred Items

None — plan executed as written. (Real ffmpeg/ffprobe/transcript-fetch + `sample()` entry point + golden-clip round-trips were already scoped to Plan 03-02 by this plan's boundaries, not deferred from it.)

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| PLAN example values appeared internally inconsistent (budget 16 + 3 cuts → 3 frames, yet "backfill to approach B") | Resolved by gap-gated cadence-aware backfill; confirmed with the user before writing RED tests, then encoded as explicit deterministic assertions |
| Full `typecheck` (tsconfig.test.json) failed after Task 2 because the still-RED assemble spec referenced Task 3 exports | Expected mid-TDD; verified `src` compiles cleanly via `tsc -p tsconfig.json` (emits `dist/sampler`); full typecheck went exit 0 after Task 3 |

## Next Phase Readiness

**Ready:**
- `selectFrameTimes` + `assembleWatchedFrameSet` + `mergeTranscript` are the stable pure core for Plan 03-02 to wrap behind the ffmpeg/ffprobe/scene-detect/transcript-fetch effect boundary and the `sample()` entry point.
- Output is guaranteed to pass `validateWatchedFrameSet`, so downstream Phase 4 (router) / tier adapters can consume it directly.

**Concerns:**
- Backfill cadence rule is validated against synthetic fixtures; 03-02's golden-clip round-trip should confirm it behaves sensibly on real ffmpeg scene-cut distributions.
- `resolution` is a caller-provided input here by design; the question→tier/resolution policy still lives in later phases (router / watch tool).
- DAVE advisory carry: no CI workflow yet — `npm test`/typecheck/build are not enforced on the PR (only a Socket Security check runs). Recommend adding `.github/workflows/ci.yml` as a separate change.

**Blockers:**
- None.

---
*Phase: 03-sampler-implementation, Plan: 01*
*Completed: 2026-06-18*
