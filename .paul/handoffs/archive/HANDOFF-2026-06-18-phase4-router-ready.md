# PAUL Handoff

status: paused
created: 2026-06-18T21:53:30Z
phase: 4 of ~9 — router
plan: none yet (Phase 4 not started; Phase 3 fully closed + merged)
loop: PLAN ○ / APPLY ○ / UNIFY ○  (clean phase boundary → next is PLAN for 04-01)
state_authority: .paul/STATE.md
resume_action: /paul:plan (Phase 4 — Router: tier-selection + escalation policy as a deterministically-tested unit)
wip_result: skipped (no project changes; only untracked .codegraph/ tooling dir)

git_snapshot:
  workflow: github-flow
  branch: main
  base: main
  pr: none open (PR #4 squash-merged → main as 2f9f669; feature branch deleted)
  ci: N/A (no .github/workflows/ yet — only Socket Security PR checks; DAVE advisory carry)
  sync: 0/0
  note: snapshot only; resume rechecks live git state when github-flow routing applies

progress:
  done:
    - Phase 3 complete end-to-end and merged. 03-01 = pure sampler core (selectFrameTimes scene-cut + gap-gated backfill + budget cap; assembleWatchedFrameSet; mergeTranscript). 03-02 = effect boundary (effects.ts: ffprobe duration / ffmpeg scene-detect + per-time PNG decode / best-effort transcript) + sample() entry point.
    - 03-02 UNIFY closed: SUMMARY written; CODI + QUALITY history rows appended; PR #4 squash-merged (2f9f669).
    - Phase transition done: PROJECT.md evolved (Phase 3 + 4 key decisions), ROADMAP Phase 3 → ✅, STATE → Phase 4 ready-to-plan; handoff archived; state consistency verified. Transition commit 91fea84 on main.
    - Suite 48/48 green on main; 0 vulns; no new deps.
  in_progress:
    - none (clean phase boundary; Phase 4 not started)
  blockers:
    - none
  decisions:
    - sample() is the single stable, validator-guaranteed sampler surface; Phase 4 (router) and Phase 5 (watch tool) wrap it — do not re-wire effects piecemeal downstream.
    - Pure Core, Explicit Effects: all sampler I/O isolated in effects.ts; spawns use execFile arg-arrays (no shell, no ref interpolation) + timeouts. Carry this pattern into any new effectful code.
    - Transcript ships best-effort ("none" fallback; fetchTranscript never throws); real caption/Whisper parsing is a deferred extension point — likely lands with tier-1 (transcript) work, not the router.
    - src/contract/* and src/sampler/* (core + effects) are stable; Phase 4 router consumes the WatchedFrameSet they produce — import, don't modify.

files:
  - path: .paul/ROADMAP.md
    reason: Phase 4 (Router) detail = "tier-selection + escalation policy as its own deterministically-tested unit" (phase 4 row + Phase Details #4)
  - path: .paul/phases/03-sampler-implementation/03-02-SUMMARY.md
    reason: Next Phase Readiness — what sample() guarantees the router can rely on
  - path: src/sampler/sample.ts
    reason: the sample() entry point + SampleOptions the router orchestrates around
  - path: src/contract/index.ts
    reason: WatchedFrameSet + validateWatchedFrameSet — the shape the router routes over
  - path: DESIGN.md
    reason: §2 tiered-router architecture (tier 1 transcript / 2 native video / 3 frames-into-context) — the router's design seed

handoff_lifecycle:
  prior_active: archived: .paul/handoffs/archive/HANDOFF-2026-06-18-phase3-02-ready.md
  note: archived handoffs are history; STATE remains source of truth

resume:
  command: /paul:resume
  expected_next: /paul:plan (Phase 4 — Router: tier-selection + escalation policy as a deterministically-tested unit)
