# PAUL Handoff

status: paused
created: 2026-06-19T13:28:00Z
phase: 5 of ~9 — watch tool primitive
plan: 05-01 — Planned, awaiting APPLY approval
loop: PLAN ✓ / APPLY ○ / UNIFY ○
state_authority: .paul/STATE.md
resume_action: /paul:apply .paul/phases/05-watch-tool-primitive/05-01-PLAN.md
wip_result: skipped (base-branch — github-flow forbids WIP commit on main; uncommitted changes are only .paul/* lifecycle artifacts)

git_snapshot:
  workflow: github-flow
  branch: main
  base: main
  pr: none open (Phase 4 PR #5 squash-merged → main as f9c558f)
  ci: N/A (no .github/workflows/ yet — only Socket Security PR checks; DAVE advisory carry)
  sync: 0/0
  note: snapshot only; resume rechecks live git state. APPLY will create the Phase-5 feature branch per github-flow.

progress:
  done:
    - Phase 5 planned. Wrote .paul/phases/05-watch-tool-primitive/05-01-PLAN.md (type: execute, NOT autonomous — 2 blocking checkpoints). Goal: wire the watch pi tool end-to-end: execute → sample() → routeContextFromSet() → route() → walkTierChain() → answer.
    - Lifecycle writes done: STATE.md (Current Position → 05-01 Planned; Loop → PLAN ✓/APPLY ○/UNIFY ○; Session Continuity refreshed) and ROADMAP.md (Phase 5 → 📝 Planning).
    - Pre-plan module dispatch recorded in PLAN <module_dispatch>: config versions match (no migration); DEAN = 0 vulns (PASS); CODI seeds [sample, route, routeContextFromSet, toOpenAIContent] all dependent-free entry points (blast radius none); TODD kept type execute with test-first Task 1.
  in_progress:
    - none (clean pause at PLAN ✓ boundary; APPLY not started)
  blockers:
    - none
  decisions:
    - Tier 3 (frames-into-context) is FULLY IMPLEMENTED this phase: frames returned to the orchestrator as pi tool-result ImageContent { type:"image", data, mimeType } (DESIGN §5 Fact #1). Tiers 1–2 ship as null-returning escalating stubs behind a stable TierRunner seam (real adapters = Phase 6).
    - Tier 3 must NOT reuse src/contract/serialize.ts toOpenAIContent — that is the OpenAI image_url WIRE shape reserved for Phase-6 tier-2 adapters, not pi's tool-result shape.
    - "Route, don't answer": consume RoutingDecision.tiers as given; the tool walks the chain (no escalation logic pushed into the router).
    - Carry Phase-1 activation finding: register synchronously, mandatory promptSnippet, ship as installed package (`pi.extensions` manifest) + enable in active loadout; do NOT call setActiveTools defensively.
    - PLAN Task 1 = blocking checkpoint:decision — ExtensionAPI type source: option-a (add devDep @earendil-works/pi-coding-agent, types-only) vs option-b (local type shim). AGENTS.md requires approval before adding deps. APPLY will pause here early.
    - import-don't-modify: src/contract/*, src/sampler/*, src/router/* are stable surfaces.

files:
  - path: .paul/phases/05-watch-tool-primitive/05-01-PLAN.md
    reason: the approved plan to execute; full task packet, ACs, boundaries, module dispatch
  - path: src/sampler/sample.ts
    reason: sample(opts) → validated WatchedFrameSet — one of the surfaces the tool wraps
  - path: src/router/route.ts
    reason: route({question, context}) → RoutingDecision (ordered tiers) + routeContextFromSet(set) — routing surface the tool drives
  - path: src/contract/watched-frame-set.ts
    reason: WatchedFrame.imageBase64/mediaType feed tier-3 ImageContent serialization
  - path: spikes/01-tool-activation/FINDINGS.md
    reason: the activation recipe the watch-tool wiring + packaging must honor

handoff_lifecycle:
  prior_active: superseded → archived: .paul/handoffs/archive/HANDOFF-2026-06-18-phase5-watch-tool-ready.md
  note: archived handoffs are history; STATE remains source of truth

resume:
  command: /paul:resume
  expected_next: /paul:apply .paul/phases/05-watch-tool-primitive/05-01-PLAN.md
