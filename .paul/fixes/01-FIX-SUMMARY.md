---
phase: no-active-phase
plan: 01
type: fix
completed: 2026-08-09T12:33:30-04:00
---

## Fix Summary

**Issue:** Long-form video sampling failed when full-rate/full-resolution ffmpeg scene detection exceeded the shared 60-second process timeout; frame budget was applied only after that scan.
**Mode:** Standard fix

### Files Changed

| File | Change |
|------|--------|
| `src/sampler/effects.ts` | Added typed process timeouts, reduced scene analysis, a ten-minute analysis limit, recoverable timeout/duration fallback, injectable test seam, and typed diagnostics. |
| `src/sampler/sample.ts` | Forwarded scene-analysis diagnostics through an optional best-effort callback without changing `WatchedFrameSet`. |
| `src/sampler/index.ts` | Exported the new timeout and scene-diagnostic types. |
| `src/watch/extension.ts` | Collected per-call scene diagnostics and exposed them on successful single-watch details. |
| `test/sampler/effects.test.ts` | Covered reduced argv, duration skip/no spawn, typed timeout fallback, non-timeout propagation, and callback isolation. |
| `test/sampler/sample.test.ts` | Covered diagnostic propagation and consumer-failure isolation at orchestration. |
| `test/watch/extension.test.ts` | Covered successful tool-result scene diagnostics and updated exact sampler call expectations. |
| `dist/**` | Rebuilt exact committed output from the changed TypeScript source. |

### Verification

- Baseline: `npm test` — 194 passed, 2 default-skipped.
- Focused: 56 tests passed across sampler effects/orchestration and registered watch boundary.
- Final: `npm test` — 201 passed, 2 default-skipped; 0 failed.
- `npm run typecheck` — PASS.
- `npm run build` — PASS; a second build produced the same `dist/**` diff hash (`967be9a…`).
- Real production-tool regression: `https://www.youtube.com/watch?v=oW6MHjzxHpU`, question `hi`, budget 1 — PASS in 7.959 seconds. Result was tier 3 with one backfill frame, captions, and `sceneDetection: { reason: "duration-skip", durationMs: 1159761, limitMs: 600000 }`; `isError` was false. The pre-fix run failed twice at 60 seconds.
- Independent code review — READY, no critical/important/minor actionable findings.
- `npm audit --json` — unchanged at 0 critical / 4 high / 2 moderate; no manifest, lockfile, or dependency change.

### Result

Fix applied successfully. Scene detection now analyzes a 2 fps / 320px stream for media up to ten minutes. Longer media skips directly to existing budget-capped uniform sampling; a typed scene-process timeout takes the same recoverable path. Missing ffmpeg, invalid media, and unrelated process failures remain fatal. Diagnostic callbacks cannot break sampling, and the single-video tool exposes fallback evidence without widening the tier-neutral frame-set contract.

Transcript-first reordering, resolver format selection, batch diagnostics, dependencies, and configuration remain unchanged and outside this fix.

### Module Execution Reports

#### Post-Apply

- **WALT (p100) — PASS:** tests 194→201 (+7), failures stayed 0, 2 live tests remain default-skipped; typecheck/build pass.
- **ARCH (p125) — WARN:** explicit effect/orchestration/extension boundaries remain intact, but `src/sampler/effects.ts` grew from 656 to 720 lines and remains a measured future split candidate.
- **SETH (p130) — PASS:** ffmpeg execution remains static argv-only through `execFile`; no shell interpolation, auth, secret, or dependency surface changed.
- **GABE (p140), DANA (p155), LUKE (p160), ARIA (p165), DAVE (p175), VERA (p185) — SKIP:** no API route, data model/migration, UI, CI/deploy, or PII-processing files changed.
- **DEAN (p150) — PASS_WITH_CONCERNS:** audit unchanged at 0 critical / 4 high / 2 moderate in the existing dev tree; no dependency artifact changed.
- **OMAR (p170) — PASS:** duration and timeout recovery are explicit and reported through a typed diagnostic; callback failures are intentionally isolated with documented best-effort catches.
- **PETE (p175) — PASS:** measured scene analysis was reduced from 67.62s to 35.59s on the reported media; production fix verification completed in 7.959s through proactive duration fallback.
- **REED (p180) — PASS:** only duration skip and typed scene timeout degrade to uniform sampling; non-timeout failures still propagate and all process calls remain bounded.
- **TODD (p200) — PASS:** seven deterministic tests added around the new behavior; focused and full suites are green.
- **DOCS (p250) — CANDIDATE_DRIFT:** `docs/YOUTUBE-SETUP.md` line 103 describes unconditional scene detection and does not mention duration/timeout uniform fallback. Advisory only; docs were outside the approved fix file list.
- **IRIS (p250) — PASS:** no review markers, dead/commented code, or unexplained empty catches in changed authored source; independent review found no actionable issue.
- **SKIP (p300) — NOTE:** durable lesson is captured in this summary: frame budgets do not bound a pre-selection full-video scan; optional scene analysis must have an explicit reduced path and recoverable uniform fallback.

#### Post-Unify

- **WALT (p100) — PASS:** appended `fix-01` to `.paul/QUALITY-HISTORY.md` with APPLY-captured 194→201 test evidence, 2 skipped live tests, passing typecheck/build, and improved trajectory.
- **SKIP (p200) — NOTE:** no separate knowledge entry emitted; this summary contains the complete source-backed lesson, context, decision, and impact.
- **CODI (p220) — PASS:** appended `fix-01` to `.paul/CODI-HISTORY.md` as `no-dispatch-found`; standard FIX artifacts contain no pre-plan CODI injection evidence.
- **RUBY (p300) — WARN:** `src/sampler/effects.ts` is now 720 lines. The new policy remains locally separated and test-backed, but a focused future module extraction is warranted before adding ASR or another media effect; no unrelated refactor was introduced in this fix.
