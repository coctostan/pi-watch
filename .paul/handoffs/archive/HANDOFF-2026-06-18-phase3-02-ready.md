# PAUL Handoff

status: paused
created: 2026-06-18T20:24:06Z
phase: 3 of ~9 — sampler-implementation
plan: 03-01 complete (UNIFY closed, PR #3 merged); 03-02 not yet planned
loop: PLAN ✓ / APPLY ✓ / UNIFY ✓  (03-01 closed → next is PLAN for 03-02)
state_authority: .paul/STATE.md
resume_action: /paul:plan (Phase 3 plan 03-02 — ffmpeg/ffprobe/transcript effect boundary + sample() entry point)
wip_result: skipped (clean tree; on main, synced 0/0)

git_snapshot:
  workflow: github-flow
  branch: main
  base: main
  pr: none open (PR #3 squash-merged → main as 82aff62; feature branch deleted)
  ci: N/A (no .github/workflows/ yet — DAVE advisory carry)
  sync: 0/0
  note: snapshot only; resume rechecks live git state when github-flow routing applies

progress:
  done:
    - 03-01 shipped the pure deterministic sampler core: selectFrameTimes (scene-cut + gap-gated cadence-aware backfill + budget-cap uniform subsample), mergeTranscript, assembleWatchedFrameSet → values pass validateWatchedFrameSet
    - 26 new deterministic specs (RED→GREEN→REFACTOR); full suite 38/38; AC-1..5 PASS; 0 vulns; no new deps
    - UNIFY closed: SUMMARY written; STATE/ROADMAP updated; CODI-HISTORY + QUALITY-HISTORY rows appended; PR #3 squash-merged to main
  in_progress:
    - none (03-01 loop fully closed; 03-02 not started)
  blockers:
    - none
  decisions:
    - Sampler backfill is gap-gated/cadence-aware (grid step = lower-median inter-cut gap for ≥2 cuts; durationMs/budget for 0/1 cuts), NOT flat fill-to-budget — resolves the dense-vs-sparse example tension
    - Budget cap uniformly subsamples scene cuts (round(i*(n-1)/(budget-1))), never first-N truncation
    - Sampler core is a pure decision layer; ffmpeg/ffprobe/transcript-fetch effects deferred to 03-02
    - src/contract/* and serialize.ts are frozen; 03-02 imports, does not modify

files:
  - path: .paul/phases/03-sampler-implementation/03-01-SUMMARY.md
    reason: closed-loop reconciliation + Next Phase Readiness for 03-02
  - path: src/sampler/index.ts
    reason: the pure core public surface 03-02 wraps behind the effect boundary
  - path: src/sampler/select-frames.ts
    reason: selectFrameTimes — consumes raw ffmpeg scene cuts + ffprobe duration in 03-02
  - path: src/sampler/assemble.ts
    reason: assembleWatchedFrameSet/mergeTranscript — consume decoded frames + fetched transcript in 03-02
  - path: src/contract/index.ts
    reason: frozen WatchedFrameSet contract + validator the sampler must satisfy

handoff_lifecycle:
  prior_active: archived: .paul/handoffs/archive/HANDOFF-2026-06-18-phase3-ready.md
  note: archived handoffs are history; STATE remains source of truth

resume:
  command: /paul:resume
  expected_next: /paul:plan (Phase 3 plan 03-02 — ffmpeg/ffprobe/transcript effect boundary + sample() entry point)
