# PAUL Handoff

status: paused
created: 2026-08-12T16:30:21Z
phase: 22 of 4 — Route before decoding
plan: none — not started
loop: PLAN ○ / APPLY ○ / UNIFY ○
state_authority: .paul/STATE.md
resume_action: /paul:plan for Phase 22
wip_result: skipped — base-branch (current branch is `main`; PAUSE does not commit lifecycle-artifact edits to the base branch)

git_snapshot:
  workflow: github-flow
  branch: main
  base: main
  pr: none
  ci: N/A
  sync: up to date with origin/main
  note: snapshot only; resume rechecks live git state when github-flow routing applies

progress:
  done:
    - Phase 21 (Range-aware evidence) fully unified: PR #32 squash-merged to main (34932d7), feature branch deleted
    - UNIFY delta routing approved: R5 amended in .paul/PRD.md (optional whole-second start/end bounds); ROADMAP deferred-debt entry amended (effects.ts, tier-runner.ts, extension.ts); R6 candidate discarded
    - Phase 22 transition writes complete: PROJECT.md evolved, ROADMAP Phase 21 marked complete and Phase 22 marked Ready to plan, STATE routed to Phase 22
    - Local main verified post-merge: 309 passed / 3 skipped
  in_progress:
    - none — clean boundary between UNIFY close and next PLAN
  blockers:
    - none
  decisions:
    - Phase 22 must preserve Phase 21's absolute half-open range/coverage semantics while reordering transcript acquisition ahead of scene detection and frame decoding (no avoided-decode claim was made in Phase 21)

files:
  - path: .paul/STATE.md
    reason: Current Position/Loop Position/Session Continuity already reflect Phase 22 ready-to-plan
  - path: .paul/ROADMAP.md
    reason: Phase 22 detail section (focus, TBD plans) is the direct input for /paul:plan
  - path: .paul/phases/21-range-aware-evidence/21-01-SUMMARY.md
    reason: Phase 22 Handoff Constraints section names exact semantics Phase 22 must not regress

handoff_lifecycle:
  prior_active: none
  note: archived handoffs are history; STATE remains source of truth

resume:
  command: /paul:resume
  expected_next: /paul:plan for Phase 22
