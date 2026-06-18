---
phase: 03-sampler-implementation
plan: 02
subsystem: sampler
tags: [sampler, effect-boundary, ffmpeg, ffprobe, scene-detection, frame-decode, transcript, sample-entry-point, watched-frame-set, pure-core-explicit-effects, execFile, golden-clip, vitest, local-first]

requires:
  - phase: 03-sampler-implementation
    provides: selectFrameTimes + assembleWatchedFrameSet + mergeTranscript (frozen 03-01 pure core) + FrameImage/AssembleInput/SelectedFrame types
  - phase: 02-sampler-data-contract
    provides: WatchedFrameSet + validateWatchedFrameSet + ResolutionTier/MediaType/TranscriptSegment/TranscriptSource contract types
provides:
  - probeDurationMs — ffprobe-backed integer-ms duration probe
  - detectSceneCutsMs — ffmpeg scene-filter scene-cut detection (ms offsets)
  - decodeFramesAt — ffmpeg per-time PNG frame decode → base64 FrameImage[], aligned 1:1
  - fetchTranscript — best-effort, never-throwing transcript fetch (degrades to "none")
  - parseDurationMs / parseSceneCutsMs — pure parsers for ffprobe/ffmpeg output
  - sample() — the sampler entry point composing effects + pure core into a validated WatchedFrameSet
affects:
  - 04-router (routes over the WatchedFrameSet sample() produces)
  - 05-watch-tool-primitive (watch tool wraps sample() directly)
  - 06-tier-adapters (consume sample() output / transcript source)

tech-stack:
  added: []
  patterns:
    - "Pure Core, Explicit Effects: all process spawns / base64 reads isolated in effects.ts; select-frames.ts + assemble.ts stay pure"
    - "Command-injection-safe spawning: execFile with argument arrays only — never exec, shell strings, shell:true, or ref interpolation"
    - "Every external-process call has a timeout + maxBuffer and throws a contextual binary-named error (ENOENT/timeout/non-zero)"
    - "Best-effort degradation: fetchTranscript never throws, returns 'none' on any failure (local-first)"
    - "Pure parsers extracted from effects (parseDurationMs/parseSceneCutsMs) and unit-tested without spawning"
    - "Golden-clip integration: deterministic clip synthesized at test time via ffmpeg lavfi — no committed video fixtures"
    - "sample() is composition-only: no validation of its own; assembleWatchedFrameSet guarantees a contract-valid result"

key-files:
  created:
    - src/sampler/effects.ts
    - src/sampler/sample.ts
    - test/sampler/effects.test.ts
    - test/sampler/sample.integration.test.ts
  modified:
    - src/sampler/index.ts

key-decisions:
  - "Decision: spawn via execFile arg-arrays exclusively (SETH) with per-call timeouts (REED) — ref never reaches a shell"
  - "Decision: fetchTranscript ships as a never-throwing 'none' fallback; real caption/Whisper parsing is a deferred extension point (planned, not scope-cut)"
  - "Decision: PNG via image2pipe for decoded frames; 'low' resolution downscales to longest-side 512 (DESIGN §3), 'high' passes through"
  - "Decision: golden clip built from 3 concatenated solid-color lavfi segments so real scene cuts exist; integration skips gracefully if ffmpeg/ffprobe absent"

patterns-established:
  - "Pattern: the sampler's only real-world surface is sample(); router/watch-tool wrap it, never the effect functions piecemeal (though they are exported for reuse/testing)"
  - "Pattern: capture real tool output once, encode it as a literal test fixture, and unit-test the pure parser against it (no spawning in unit tests)"

duration: ~2min
started: 2026-06-18T21:24:01Z
completed: 2026-06-18T21:26:11Z
---

# Phase 03 Plan 02: Sampler Effect Boundary + sample() Entry Point Summary

**Shipped the sampler's effect boundary and the `sample()` entry point — ffprobe duration, ffmpeg scene-cut detection + per-time PNG decode, and a best-effort transcript — composing the frozen 03-01 pure core into a validated `WatchedFrameSet`, proven by a ffmpeg-`lavfi` golden-clip round-trip. Suite 38→48 green, 0 vulnerabilities, no new dependencies; all spawns use `execFile` arg-arrays with timeouts.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~2 min |
| Started | 2026-06-18T21:24:01Z |
| Completed | 2026-06-18T21:26:11Z |
| Tasks | 3 completed |
| Files modified | 5 (4 created, 1 modified) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: ffprobe yields integer duration | Pass | `probeDurationMs` runs `ffprobe -show_entries format=duration`; `parseDurationMs` maps seconds → `Math.round(s*1000)`, throws on `N/A`/empty/negative/unparseable. Unit-tested + exercised by golden clip (durationMs > 0). |
| AC-2: ffmpeg scene detection yields ordered in-range cuts | Pass | `detectSceneCutsMs` uses `select='gt(scene,t)',showinfo` → stderr; `parseSceneCutsMs` extracts `pts_time:` only (ignores `frame_rate`/`time_base` lines), ms-rounds, keeps `[0,durationMs)`, dedupes, sorts. Unit-tested against captured showinfo blob. |
| AC-3: frame decode is aligned and base64-encoded | Pass | `decodeFramesAt` decodes one PNG per time (image2pipe), returns `FrameImage[]` same length/order; golden clip asserts every frame has non-empty base64, no `data:` prefix, `mediaType === "image/png"`. |
| AC-4: sample() golden-clip round-trip → valid WatchedFrameSet | Pass | `validateWatchedFrameSet(result).ok === true` on the synthesized clip; `frames.length <= budget` (tested at 8 and 3), sequential zero-based indices, tMs-ascending, mm:ss timestamps, `frameCount === frames.length`, `source.ref === clipPath`. |
| AC-5: transcript fetch best-effort and degrades locally | Pass | Local clip → `fetchTranscript` returns `{ segments: [], source: "none" }`; `source.transcriptSource === "none"`, `transcript === []`; never throws on missing binary/no network. |

## Module Execution Reports

Registry: `modules.yaml` loaded (kernel_version 2.0.0).

### Pre-apply
- **WALT** (p100): baseline captured — `npm test` = 38 passed / 0 failing (3 files). `test_baseline` set.
- **TODD** (p50): PLAN `type: execute`, no RED-first task → **skipped — no TDD enforcement for this scope**.

### Test Execution
| Task | Commit | Status |
|------|--------|--------|
| Task 1 effect layer | `8c7e591` | ✓ typecheck exit 0 (real `tsc`, empty output) |
| Task 2 sample()+surface | `1e6494f` | ✓ typecheck exit 0; one-way import boundary |
| Task 3 tests | `3cac4b1` | ✓ `vitest run` → 48/48 (38 baseline + 10 new) |

### Quality
| Metric | Before | After | Delta | Trajectory |
|--------|--------|-------|-------|------------|
| Tests passing | 38 | 48 | +10 | ▲ |
| Typecheck (tsconfig.test) | exit 0 | exit 0 | — | ● |
| Build (tsconfig) | exit 0 | exit 0 | — | ● |
| Vulnerabilities (npm audit) | 0 | 0 | 0 | ● |
**Overall:** ▲ improved (+10 specs; effect boundary + entry point added with zero new deps)

### Post-apply (advisory)
- **ARCH** (p125): `effects.ts`(241L)/`sample.ts`(90L) import one-way → pure core + contract; core/contract never import the effect layer. Explicit effect boundary aligns with functional-first "Pure Core, Explicit Effects". No god-files. No findings.
- **SETH** (p130): all spawns via `execFile` arg-arrays; verified no `exec()`, no `shell:true`, no `ref` interpolation into a command string. No secret-like literals. No findings.
- **REED** (p180): every spawn has `timeout` (60s) + `maxBuffer`; `run()` throws contextual binary-named errors on ENOENT/timeout/non-zero; `fetchTranscript` never throws. No findings.
- **PETE** (p175): one ffprobe + one ffmpeg scene-pass + ≤budget frame decodes; bounded by budget, not clip length. No perf concern.
- **OMAR** (p170): no silent empty catches — `fetchTranscript`'s catch is an intentional documented best-effort fallback; `run()` rethrows with context. No findings.
- **DOCS** (p250): changed source maps to DESIGN.md §3 (already describes ffmpeg scene-change + decode + transcript merge); no README → NO_DOC, non-blocking.
- **IRIS** (p250): no review markers, no dead code. No concerns.
- **DAVE** (p175): no CI config changed; `.github/workflows/` still absent — advisory carry (recommend `ci.yml`; separate change).
- **GABE / LUKE / ARIA / DANA / VERA**: no API / UI / a11y / data-migration / PII surface — SKIP.

### Post-apply (enforcement)
- **WALT** (p100): re-ran tests → 48/48 pass (baseline 38 → +10); typecheck + build exit 0. **PASS**.
- **TODD** (p200): full suite green; no unresolved regressions. **PASS**.
- **DEAN** (p150): `npm audit` → 0 vulnerabilities; no new dependencies. **PASS**.

### Pre-unify / Post-unify
- `[dispatch] pre-unify: 0 modules registered for this hook`
- **CODI** (p220) post-unify: row appended to `.paul/CODI-HISTORY.md`.
- **WALT** (p100) post-unify: row appended to `.paul/QUALITY-HISTORY.md` — Tests 38→48, verdict ▲ improved (+10).
- **RUBY** (p300) post-unify: changed files measured; largest `effects.ts` 241 lines; no god-files, no debt patterns; pure parsers + isolated effects. No technical debt concerns.
- **SKIP** (p200) post-unify: knowledge entry recorded — execFile-arg-array + timeout effect-boundary pattern; best-effort never-throwing transcript fallback (source: Decisions).

## Accomplishments

- Built the sampler's **effect boundary** (`effects.ts`): the single place process spawns and base64 reads live, keeping the 03-01 decision/assembly core pure (AGENTS.md "Pure Core, Explicit Effects").
- Implemented **`sample()`** — the one real-world surface the router (Phase 4) and `watch` tool (Phase 5) will wrap — composing probe → scene-detect → pure budget-cap → decode → transcript → assemble into a validator-passing `WatchedFrameSet`.
- Made the boundary **safe and robust by construction**: `execFile` arg-arrays only (no shell, no `ref` interpolation), per-call timeouts, contextual errors, and a never-throwing best-effort transcript.
- Proved it end-to-end with a **local-first golden-clip round-trip** (ffmpeg `lavfi`, no committed binaries) plus pure-parser unit tests; 38→48 suite green.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: effect boundary | `8c7e591` | feat | `effects.ts` — probe/scene-detect/decode/transcript + pure parsers; execFile arg-arrays + timeouts |
| Task 2: sample() + surface | `1e6494f` | feat | `sample.ts` orchestrator + extended `index.ts` exports |
| Task 3: tests | `3cac4b1` | test | parser units + ffmpeg-lavfi golden-clip round-trip; 38→48 |

Plan metadata: committed with UNIFY (this SUMMARY + STATE + ROADMAP).

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/sampler/effects.ts` | Created | Effect boundary: `probeDurationMs`/`detectSceneCutsMs`/`decodeFramesAt`/`fetchTranscript` + pure `parseDurationMs`/`parseSceneCutsMs` |
| `src/sampler/sample.ts` | Created | `sample()` entry point composing effects + pure core into a validated `WatchedFrameSet` |
| `src/sampler/index.ts` | Modified | Re-export `sample`, effect functions, and pure parsers; expanded module doc |
| `test/sampler/effects.test.ts` | Created | Pure-parser unit tests (no spawning) — AC-1/AC-2 |
| `test/sampler/sample.integration.test.ts` | Created | ffmpeg-lavfi golden-clip round-trip — AC-3/AC-4/AC-5 |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `execFile` arg-arrays only, per-call timeouts | `ref` is caller-supplied and flows into argv; a shell string or `exec` interpolation is a command-injection vector (SETH); external processes must never hang (REED) | Boundary is injection-safe and bounded by construction; the pattern carries to any future spawn |
| `fetchTranscript` ships as never-throwing `"none"` fallback | Local-first: `whisper` is absent on this machine and captions need a network URL; a clean "none" keeps `sample()` working everywhere while real caption/Whisper parsing is a deferred extension point (planned by 03-02 boundaries, not scope-cut) | AC-5 satisfied; Phase 6 tier-1 / a later transcript plan fills in real parsing without changing the seam |
| PNG via `image2pipe`; "low" downscales to longest-side 512 | DESIGN §3 resolution policy; PNG is lossless and contract-valid (`MediaType` allows png/jpeg) | Deterministic, validator-clean frames; jpeg path remains open if size matters later |
| Golden clip = 3 concatenated solid-color lavfi segments | Guarantees real scene cuts for ffmpeg to find without committing a binary fixture (local-first testing) | Reproducible integration coverage; skips gracefully where ffmpeg/ffprobe are unavailable |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | — |
| Scope additions | 0 | — |
| Deferred | 1 | Real caption/Whisper transcript parsing — explicitly scoped as a deferred extension point by the plan's boundaries, not cut from it |

**Total impact:** Negligible. Plan executed as written. The transcript "none" fallback is the planned behavior for this phase (boundaries: "Transcript fetch is best-effort only … a clean 'none' fallback fully satisfies this plan"), not a reduction in delivered scope. No new dependencies, no boundary violations (contract + 03-01 pure core untouched).

### Deferred Items
- Real transcript extraction (yt-dlp caption download/parse + local Whisper ASR) — a deliberate extension point for a later transcript/tier-1 plan; `fetchTranscript`'s signature already returns the right shape so the seam is stable.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Bash tool surfaced a canned "✓ Build successful" wrapper line for `tsc`/`vitest`/`npm` invocations, masking real stdout/exit codes | Redirected each command's output + `$?` to `/tmp/*` files and read them back — confirmed real results: typecheck/build empty output exit 0, suite 48/48 exit 0, audit 0 vulns |
| A single `testsrc` lavfi source yields no scene cut | Built the golden clip from 3 concatenated solid-color segments so the scene filter detects real cuts (confirmed `pts_time:2` at the boundary) |

## Next Phase Readiness

**Ready:**
- `sample()` is the stable, validator-guaranteed entry point Phase 4 (router) and Phase 5 (`watch` tool) wrap — one surface, no piecemeal effect wiring needed downstream.
- Effect functions + pure parsers are exported and independently testable/reusable by later phases (e.g. tier-1 transcript, tier-3 frame handoff).

**Concerns:**
- Transcript is "none" until a real caption/Whisper plan lands; tier-1 (transcript) work depends on filling `fetchTranscript`.
- Scene-detection threshold (0.4) and "low" downscale (512) are validated on synthetic clips; real-world clips may warrant tuning — revisit when wiring the router/tool against actual videos.
- DAVE advisory carry: no CI workflow yet — `npm test`/typecheck/build are not enforced on PRs (only Socket Security runs). Recommend `.github/workflows/ci.yml` as a separate change.

**Blockers:**
- None.

---
*Phase: 03-sampler-implementation, Plan: 02*
*Completed: 2026-06-18*
