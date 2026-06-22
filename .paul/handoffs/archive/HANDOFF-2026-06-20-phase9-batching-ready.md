# PAUL Handoff

status: paused
created: 2026-06-20T20:01:00Z
phase: 9 of ~9 — batching
plan: none yet (Phase 9 not started; Phase 8 complete + merged)
loop: PLAN ○ / APPLY ○ / UNIFY ○ (clean phase boundary)
state_authority: .paul/STATE.md
resume_action: /paul:plan for Phase 9 (batching)
wip_result: skipped (clean tree; only untracked .codegraph/ tooling cache; no lifecycle changes)

git_snapshot:
  workflow: github-flow
  branch: main
  base: main
  pr: none open (PR #10 merged → squash 0c26401; transition commit 6248cc5)
  ci: N/A (no work branch yet; merge gate is Socket-Security-only)
  sync: 0/0 with origin/main
  note: snapshot only; resume rechecks live git state when github-flow routing applies

progress:
  done:
    - Phase 8 complete + merged: 08-01 (/watch command). A pure parse/prompt/run core (src/watch/command.ts) + pi.registerCommand("watch", …) at the extension boundary, registered synchronously alongside the watch tool (activation recipe).
    - Decision (option-a): the /watch command DELEGATES to the agent via pi.sendUserMessage rather than running the pipeline in the handler — the only path that preserves tier 3 (sampled frames are tool-result ImageContent destined for the orchestrator, DESIGN §5 #1; a void-returning handler can only notify text).
    - Additive only; frozen core (sampler/router/config/tier-runner/tier2) untouched; suite 117/117 green; typecheck+build clean; npm audit 0 vulns; 0 new deps.
    - PR #10 squash-merged (0c26401); main synced; feature branch deleted; transition committed (6248cc5) + pushed; PROJECT/STATE/ROADMAP advanced to Phase 9; phase-8 handoff archived.
  in_progress:
    - none (clean boundary; Phase 9 not yet planned)
  blockers:
    - none
  decisions:
    - (Phase 8) /watch command = pure parse/prompt/run core + injected effects (ctx.ui.notify, pi.sendUserMessage); registerCommand synchronous alongside the tool.
    - (Phase 8) option-a: delegate to the agent (preserves all three tiers) over direct in-handler pipeline invocation (would break tier 3).
    - (Phase 8) Deferred: /watch budget/resolution flag parsing + getArgumentCompletions autocomplete — out of v0.1 scope.

next_plan_seed (Phase 9 — batching):
  - Build batching as the last v0.1 piece (DESIGN §7 build order step 6). The sampler, router, all three tiers, config surface, the watch tool, AND the /watch command are all in place to batch over.
  - Approach per DESIGN §2/§7/§9: `Promise.all` over tiers 1/2 first (cheap, parallel); subagent fan-out for tier-3 batch only if/when needed (⏸️ deferred unless a concrete tier-3-batch need appears — DESIGN §9 "decided/rejected: subagent fan-out only needed for tier-3 batch; defer").
  - Decide the batch surface: does batching extend the watch tool (e.g. an array of refs/questions), a new tool, and/or a /watch-batch command? Keep the pure-core/effect-boundary split and the agent-delegation UX pattern established in Phase 8.
  - Keep our-sampling ownership; tier-2 backends stay thin OpenAI-compatible adapters (baseURL + model id), never per-model forks; cloud (Gemini) optional, never required (AGENTS.md).

files:
  - path: src/watch/extension.ts
    reason: the effect boundary registering both the watch tool and /watch command — batching likely extends/wraps this surface.
  - path: src/watch/command.ts
    reason: Phase-8 command pattern (pure core + injected effects + agent delegation) to mirror for any batch command.
  - path: src/watch/tier-runner.ts
    reason: the pure tier-walk core; tier 1/2 are the parallel-batch candidates, tier 3 is the fan-out-only case.
  - path: src/config/config.ts
    reason: resolveWatchConfig — per-video config overrides layer on the same resolver (07-01 SUMMARY: affects 09-batching).
  - path: DESIGN.md
    reason: §2 (tiers), §7 step 6 (batching build order), §9 (subagent fan-out deferred; only for tier-3 batch).
  - path: .paul/phases/08-watch-command/08-01-SUMMARY.md
    reason: Phase 8 outcome + Next Phase Readiness seeds Phase 9 scope.

carries:
  - FINDINGS #4: installed watch/`/watch` must be enabled in the active loadout or a setActiveTools governor strips it.
  - DAVE: still no .github/workflows/ci.yml — the GitHub-Flow merge gate is Socket-Security-only (no test/build CI). Consider a dedicated CI plan.
  - DOCS: typebox could move from dependencies to peerDependencies (pi-bundled). Optional.
  - Deferred: file-based config + tier-order override (Phase 7); /watch budget/resolution flags + autocomplete (Phase 8).
  - Phase 9 is the LAST v0.1 phase — completing it triggers milestone completion (Route B), not another phase.

handoff_lifecycle:
  prior_active: none (phase-8 handoff archived to .paul/handoffs/archive/ during the Phase-8 transition)
  note: archived handoffs are history; STATE remains source of truth

resume:
  command: /paul:resume
  expected_next: /paul:plan for Phase 9 (batching)
