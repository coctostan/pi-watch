# PAUL Handoff

status: paused
created: 2026-06-18T22:38:30Z
phase: 5 of ~9 — watch tool primitive
plan: none yet (Phase 5 not started; Phase 4 fully closed + merged)
loop: PLAN ○ / APPLY ○ / UNIFY ○  (clean phase boundary → next is PLAN for 05-01)
state_authority: .paul/STATE.md
resume_action: /paul:plan (Phase 5 — watch tool primitive: ref + question → sample() → route() → answer)
wip_result: skipped (no project changes; only untracked .codegraph/ tooling dir)

git_snapshot:
  workflow: github-flow
  branch: main
  base: main
  pr: none open (PR #5 squash-merged → main as f9c558f; feature branch deleted)
  ci: N/A (no .github/workflows/ yet — only Socket Security PR checks; DAVE advisory carry)
  sync: 0/0
  note: snapshot only; resume rechecks live git state when github-flow routing applies

progress:
  done:
    - Phase 4 complete end-to-end and merged. 04-01 = the pure router (src/router/): classifyQuestion + route + routeContextFromSet. Policy: spoken+transcript → [1,2,3]; spoken-no-transcript / visual / on-screen-text → [2,3]; on-screen-text → resolution "high"; every chain ends in tier 3 (universal fallback). 16 route-asserting specs (suite 48→64), 0 vulns, no new deps.
    - 04-01 UNIFY closed: SUMMARY written; CODI + QUALITY history rows appended; PR #5 squash-merged (f9c558f).
    - Phase transition done: PROJECT.md evolved (Phase 4 outcome + router decisions), ROADMAP Phase 4 → ✅ (4/9 ~44%), STATE → Phase 5 ready-to-plan; phase-4 handoff archived; state consistency verified. Transition commit 16b971b on main.
    - Suite 64/64 green on main.
  in_progress:
    - none (clean phase boundary; Phase 5 not started)
  blockers:
    - none
  decisions:
    - "Route, don't answer": the router emits an ordered tier chain (a decision); the watch tool walks it and owns confidence-based escalation. Phase 5 consumes route() output — do not push escalation logic back into the router.
    - Carry Phase-1 activation finding: ship the watch tool as an installed package and ensure it is in the active loadout (a setActiveTools/pi-loadout governor strips ad-hoc / -e-loaded tools). See spikes/01-tool-activation/FINDINGS.md.
    - src/contract/*, src/sampler/*, src/router/* are stable surfaces — import, don't modify. Transcript still ships best-effort "none" until a real caption/Whisper plan lands.
    - Tier *adapters* (tier 1/2/3 backends) are Phase 6 — Phase 5 may need a thin answer seam/stub; clarify scope at plan time.

files:
  - path: .paul/ROADMAP.md
    reason: Phase 5 (watch tool primitive) detail = "video ref + question → sampler → router → answer" (phase 5 row + Phase Details #5); also the early architectural open question (standalone vs pi-web-access interop)
  - path: src/sampler/sample.ts
    reason: sample(opts) → validated WatchedFrameSet — one of the two surfaces the watch tool wraps
  - path: src/router/route.ts
    reason: route({question, context}) → RoutingDecision (ordered tiers) + routeContextFromSet(set) → RouteContext — the routing surface the watch tool drives
  - path: spikes/01-tool-activation/FINDINGS.md
    reason: the tool-activation resolution the watch-tool wiring must honor (installed package + active loadout)
  - path: DESIGN.md
    reason: §2 tiered-router + §7 build order step 3 (watch tool primitive) + the print-mode tool-activation gotcha note

handoff_lifecycle:
  prior_active: archived: .paul/handoffs/archive/HANDOFF-2026-06-18-phase4-router-ready.md
  note: archived handoffs are history; STATE remains source of truth

resume:
  command: /paul:resume
  expected_next: /paul:plan (Phase 5 — watch tool primitive: ref + question → sample() → route() → answer)
