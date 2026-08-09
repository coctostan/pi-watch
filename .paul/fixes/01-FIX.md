---
phase: no-active-phase
plan: 01
type: fix
wave: 1
depends_on: []
files_modified:
  - src/sampler/effects.ts
  - src/sampler/sample.ts
  - src/sampler/index.ts
  - src/watch/extension.ts
  - test/sampler/effects.test.ts
  - test/sampler/sample.test.ts
  - test/watch/extension.test.ts
  - dist/**
autonomous: true
---

<objective>
## Fix

Prevent long-form videos from failing when full-resolution ffmpeg scene detection exceeds the sampler's fixed 60-second process timeout. Keep scene analysis bounded, degrade recoverably to budget-capped uniform sampling, and expose the fallback reason without widening the `WatchedFrameSet` contract.
</objective>

<tasks>

<task type="auto">
  <name>Fix: bound scene analysis and recover to uniform sampling</name>
  <files>src/sampler/effects.ts, src/sampler/sample.ts, src/sampler/index.ts, src/watch/extension.ts, test/sampler/effects.test.ts, test/sampler/sample.test.ts, test/watch/extension.test.ts, dist/**</files>
  <action>
- Analyze scene changes on a reduced temporal/spatial stream rather than full-resolution/full-rate frames.
- Skip scene detection for videos longer than an explicit ten-minute analysis limit and return no cuts so the existing selector produces uniform backfill frames.
- Treat only a scene-detection timeout as recoverable; preserve fatal behavior for missing ffmpeg, invalid media, and unrelated process failures.
- Emit a typed diagnostic for duration-skip or timeout fallback through an optional sampler callback, and include it in single-video watch result details without changing the tier-neutral frame-set contract.
- Add deterministic tests for reduced ffmpeg arguments, duration skip, timeout fallback, non-timeout failure preservation, callback propagation, and tool-result diagnostics.
- Rebuild committed dist output exactly from source.
- Do not reorder transcript routing, change resolver format selection, add dependencies, or introduce unrelated refactors.
  </action>
  <verify>
Run focused sampler/watch tests, full `npm test`, `npm run typecheck`, `npm run build`, confirm committed `dist/**` matches the fresh build, and execute the production registered `watch` tool against `https://www.youtube.com/watch?v=oW6MHjzxHpU` with budget 1 to prove the prior timeout now degrades successfully.
  </verify>
  <done>The reported long-form URL returns a non-error watch result, fallback diagnostics are legible, and all default validation remains green.</done>
</task>

</tasks>

<verification>
- [x] Fix applied and verified
- [x] Reported long-form URL succeeds through the production tool
- [x] No regressions introduced
</verification>
