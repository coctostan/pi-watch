# PAUL Handoff

status: paused
created: 2026-06-19T15:42:00Z
phase: 6 of ~9 — tier-adapters
plan: none yet (Phase 6 not started)
loop: PLAN ○ / APPLY ○ / UNIFY ○
state_authority: .paul/STATE.md
resume_action: /paul:plan for Phase 6 (tier adapters)
wip_result: skipped (no uncommitted lifecycle changes; clean phase boundary)

git_snapshot:
  workflow: github-flow
  branch: main
  base: main
  pr: none (PR #6 merged d355a91)
  ci: N/A (no work branch yet)
  sync: 0/0 with origin/main
  note: snapshot only; resume rechecks live git state when github-flow routing applies

progress:
  done:
    - Phase 5 complete + merged (PR #6 → d355a91): watch tool primitive shipped end-to-end.
    - Transition committed (ad47d60): PROJECT.md evolved, STATE/ROADMAP at Phase 6, handoffs archived.
    - Suite 73/73 green; npm audit 0 vulns; state consistency verified across STATE/PROJECT/ROADMAP.
  in_progress:
    - none (clean phase boundary; Phase 6 not yet planned)
  blockers:
    - none
  decisions:
    - Tier 3 (frames-into-context) already ships; Phase 6 only adds tier 1 + tier 2 behind the stable TierRunner seam.
    - Tier runners plug in via `TierRunner = (args) => TierResult | null` in src/watch/tier-runner.ts (null = escalate); swap tier1Runner/tier2Runner in defaultRunners — no extension.ts/orchestrator change needed.
    - We own sampling; tier-2 backends are thin OpenAI-compatible adapters (baseURL + model id), never code forks (AGENTS.md). Qwen3-VL is the local tier-2 pick; Gemini optional.

files:
  - path: src/watch/tier-runner.ts
    reason: Phase 6 implements tier1Runner (transcript summarization) + tier2Runner (OpenAI-compat video) here, replacing the null stubs.
  - path: src/router/route.ts
    reason: Tier chain policy the runners consume (spoken+transcript → [1,2,3]; else [2,3]).
  - path: .paul/ROADMAP.md
    reason: Phase 6 scope — tier 1 (transcript), tier 2 (local Qwen / hosted Gemini), tier 3 (already done).
  - path: DESIGN.md
    reason: §2 tiered router + tier-2 OpenAI-compat adapter design (source of truth).

handoff_lifecycle:
  prior_active: none (Phase 5 handoffs already archived during transition to .paul/handoffs/archive/)
  note: archived handoffs are history; STATE remains source of truth

resume:
  command: /paul:resume
  expected_next: /paul:plan for Phase 6 (tier adapters)
