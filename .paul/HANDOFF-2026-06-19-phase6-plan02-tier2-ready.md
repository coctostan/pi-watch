# PAUL Handoff

status: paused
created: 2026-06-19T17:20:00Z
phase: 6 of ~9 — tier-adapters
plan: 06-01 loop closed + merged; 06-02 (tier-2 adapter) not yet planned
loop: PLAN ✓ / APPLY ✓ / UNIFY ✓ (for 06-01)
state_authority: .paul/STATE.md
resume_action: /paul:plan for Phase 6 Plan 06-02 (tier-2 OpenAI-compatible video adapter)
wip_result: skipped (only untracked .codegraph/ tooling cache; no lifecycle changes)

git_snapshot:
  workflow: github-flow
  branch: main
  base: main
  pr: none open (PR #7 merged → 5dbf603)
  ci: N/A (no work branch yet; Socket Security passed on PR #7)
  sync: 0/0 with origin/main
  note: snapshot only; resume rechecks live git state when github-flow routing applies

progress:
  done:
    - Plan 06-01 complete + merged (PR #7 → 5dbf603): tier seam made async + tier 1 transcript adapter shipped.
    - Suite 77/77 green; typecheck+build clean; npm audit 0 vulns; zero new deps.
    - UNIFY closed: SUMMARY written (AC-1/2/3 PASS); STATE/ROADMAP updated; consumed handoff archived.
  in_progress:
    - none (clean boundary; 06-02 not yet planned)
  blockers:
    - none
  decisions:
    - Tier seam is async: TierRunner = (args) => Promise<TierResult | null>; walkTierChain is async; extension.ts awaits it. (Supersedes the Phase-5 sync-seam note.)
    - Tier 1 = transcript passthrough (option-a): hand mm:ss transcript to orchestrator, null = escalate. Local-first, zero deps.
    - 06-02 plugs tier 2 in by replacing the tier2Runner stub in defaultRunners — no walkTierChain/extension.ts change needed (seam is ready).

next_plan_seed (06-02 — tier 2):
  - Implement tier2Runner: OpenAI-compatible /v1/chat/completions call (image_url blocks + text) using Node ≥20 global fetch (no new deps).
  - Serialize via existing contract helper toOpenAIContent(set, {header}) (src/contract/serialize.ts) — proven tier-2 wire shape.
  - Adapter = baseURL + model id only (DESIGN §4). Local default: mlx-community/Qwen3-VL-8B-Instruct-4bit via mlx_vlm.server; Gemini optional (never required).
  - Escalation/failure: return null on missing config / non-2xx / network error so walkTierChain falls through to tier 3.
  - Config (baseURL/model id/key) source is a Phase-7 concern; for 06-02 use env-var bridge or injected config, no committed secrets (SETH).
  - Test with a mocked/injected HTTP transport (no live model), mirroring the existing runner-table mocking in test/watch/tier-runner.test.ts.

files:
  - path: src/watch/tier-runner.ts
    reason: tier2Runner stub lives here (now async); replace with real adapter in 06-02.
  - path: src/contract/serialize.ts
    reason: toOpenAIContent — reuse as the tier-2 serialization target.
  - path: .paul/phases/06-tier-adapters/06-01-SUMMARY.md
    reason: Next Phase Readiness section seeds 06-02 scope.
  - path: DESIGN.md
    reason: §4 model adapters (tier 2 = baseURL + model id) + §5 Verified Fact #2 (local Qwen tier-2 works).

handoff_lifecycle:
  prior_active: none (prior phase-6-ready handoff already archived to .paul/handoffs/archive/ during 06-01 UNIFY)
  note: archived handoffs are history; STATE remains source of truth

resume:
  command: /paul:resume
  expected_next: /paul:plan for Phase 6 Plan 06-02 (tier-2 OpenAI-compatible video adapter)
