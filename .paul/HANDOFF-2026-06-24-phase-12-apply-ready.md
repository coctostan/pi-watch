# PAUL Handoff

status: paused
created: 2026-06-24T18:44:00Z
phase: 12 of 13 — Tier-2 failure diagnostics
plan: 12-01 — created, APPLY not started
loop: PLAN ✓ / APPLY ○ / UNIFY ○
state_authority: .paul/STATE.md
resume_action: /paul:apply for 12-01 (resolve the diagnostic-plumbing checkpoint first)
wip_result: skipped — base-branch (github-flow on `main`); only local/uncommitted `.paul/*` lifecycle changes + untracked `.codegraph/`

git_snapshot:
  workflow: github-flow
  branch: main
  base: origin/main
  pr: none open; PR #13 merged
  ci: N/A — no open PR
  sync: 0 behind / 0 ahead origin/main at pause snapshot
  note: snapshot only; resume rechecks live git state when github-flow routing applies

progress:
  done:
    - Phase 11 (11-01) complete and merged via PR #13; Phase 12 routing established.
    - Created `.paul/phases/12-tier2-failure-diagnostics/12-01-PLAN.md` (type: execute, non-autonomous; 1 blocking checkpoint:decision + 3 auto tasks) with full pre-plan module dispatch recorded.
    - Updated STATE Current Position / Progress / Loop Position (PLAN ✓ APPLY ○ UNIFY ○) and ROADMAP Phase 12 → 🚧 Planning, milestone 50% (2 of 4).
  in_progress:
    - None. 12-01 is planned and awaiting APPLY approval; no source files edited yet.
  blockers:
    - None.
  decisions:
    - 12-01 surfaces structured tier-2 diagnostics (unconfigured / http-error+status / empty-answer / timeout / network-error) into watch + watch_batch `details`.
    - The null→tier-3 escalation invariant, tier-3 totality, and the model-agnostic OpenAI-compatible adapter are held FIXED (DO NOT CHANGE).
    - APPLY must first resolve a blocking checkpoint:decision — diagnostic plumbing option-a (onDiagnostic boundary collector; smallest blast radius, leaves tier-runner.ts + its tests untouched) vs option-b (typed tier-walk result). CODI `impact` confirmed `extension.ts` is the only depth-1 dependent of `createTier2Runner`.

files:
  - path: .paul/phases/12-tier2-failure-diagnostics/12-01-PLAN.md
    reason: The approved plan to execute in APPLY; contains the checkpoint, ACs, tasks, and boundaries.
  - path: .paul/STATE.md
    reason: Resume source of truth; Session Continuity points here for Phase 12 APPLY.
  - path: src/watch/tier2.ts
    reason: Task 1 target — createTier2Runner holds the five null-returning failure branches to diagnose.
  - path: src/watch/extension.ts
    reason: Task 2 target — effect boundary that builds tool-result `details` for watch + watch_batch.
  - path: src/watch/tier-runner.ts
    reason: Holds the null===escalate invariant; touched only if checkpoint selects option-b.
  - path: .paul/phases/11-tier2-live-proof/11-01-SUMMARY.md
    reason: Direct prior-work context; Phase 11 deferred this diagnostics debt to Phase 12.

handoff_lifecycle:
  prior_active: archived: .paul/handoffs/archive/HANDOFF-2026-06-24-phase-12-plan-ready.md
  note: archived handoffs are history; STATE remains source of truth

resume:
  command: /paul:resume
  expected_next: /paul:apply for 12-01 (resolve the diagnostic-plumbing checkpoint first)
