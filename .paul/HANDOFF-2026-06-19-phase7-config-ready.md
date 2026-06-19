# PAUL Handoff

status: paused
created: 2026-06-19T19:12:00Z
phase: 7 of ~9 — config-surface
plan: none yet (Phase 7 not started; Phase 6 complete + merged)
loop: PLAN ○ / APPLY ○ / UNIFY ○ (clean phase boundary)
state_authority: .paul/STATE.md
resume_action: /paul:plan for Phase 7 (config surface)
wip_result: skipped (clean tree; only untracked .codegraph/ tooling cache; no lifecycle changes)

git_snapshot:
  workflow: github-flow
  branch: main
  base: main
  pr: none open (PR #8 merged → 0bd585a)
  ci: N/A (no work branch yet; Socket Security gated PR #8)
  sync: 0/0 with origin/main
  note: snapshot only; resume rechecks live git state when github-flow routing applies

progress:
  done:
    - Phase 6 complete + merged: 06-01 (async TierRunner seam + tier 1 transcript passthrough) and 06-02 (tier 2 OpenAI-compatible native-video adapter, src/watch/tier2.ts).
    - All three tiers now implemented: 1 transcript → 2 OpenAI-compat video → 3 frames-into-context. `watch` answers via the cheapest tier or escalates to tier 3.
    - Suite 93/93 green; typecheck+build clean; npm audit 0 vulns; zero new deps. Transition committed (892bd76); PROJECT/STATE/ROADMAP advanced to Phase 7; phase-6 handoff archived.
  in_progress:
    - none (clean boundary; Phase 7 not yet planned)
  blockers:
    - none
  decisions:
    - Tier-2 code lives in its own effect module src/watch/tier2.ts (06-02 checkpoint option-a); tier-runner.ts stays a pure walk core and only references createTier2Runner when building defaultRunners.
    - Tier-2 config is an isolated env bridge for now (resolveTier2ConfigFromEnv, WATCH_TIER2_*); the typed config surface is Phase 7's job. createTier2Runner already takes a Tier2Config, so the seam is createTier2Runner({ config }).

next_plan_seed (Phase 7 — config surface):
  - Replace the env-var bridge with a typed config: baseURL + model id (required), optional API key, tier order, frame budget, resolution thresholds, and a fetch timeout/AbortSignal (PETE carry — tier-2 fetch currently has no timeout).
  - Adapter = baseURL + model id only (DESIGN §4); local default mlx-community/Qwen3-VL-8B-Instruct-4bit via mlx_vlm.server; Gemini optional, never required (AGENTS.md local-first).
  - Wire the resolved config into createTier2Runner({ config }) and into the watch extension's WATCH_PARAMS/route inputs as appropriate; keep no committed secrets (SETH).
  - Decide config source/precedence (env → file → tool params?) and where it loads (extension boundary vs a new src/config module). Keep the pure-core/effect-boundary split.

files:
  - path: src/watch/tier2.ts
    reason: Tier-2 adapter + resolveTier2ConfigFromEnv (the env bridge Phase 7 replaces); already accepts a Tier2Config.
  - path: src/watch/extension.ts
    reason: effect boundary + WATCH_PARAMS; likely where resolved config is wired into createTier2Runner({ config }).
  - path: .paul/phases/06-tier-adapters/06-02-SUMMARY.md
    reason: Next Phase Readiness section seeds Phase 7 scope (config surface, fetch timeout, CI gap).
  - path: DESIGN.md
    reason: §4 model adapters (tier 2 = baseURL + model id) — config shape source of truth.

carries:
  - DAVE: still no .github/workflows/ci.yml — the GitHub-Flow merge gate is Socket-Security-only (no test/build CI). Consider addressing in/around Phase 7.
  - PETE: tier-2 fetch has no timeout/abort; fold an AbortSignal timeout into the Phase-7 config.
  - DOCS: typebox could move from dependencies to peerDependencies (pi-bundled). Optional.
  - FINDINGS #4: installed `watch` must be enabled in the active loadout or a setActiveTools governor strips it.

handoff_lifecycle:
  prior_active: none (phase-6 handoff archived to .paul/handoffs/archive/ during the Phase-6 transition)
  note: archived handoffs are history; STATE remains source of truth

resume:
  command: /paul:resume
  expected_next: /paul:plan for Phase 7 (config surface)
