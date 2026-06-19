# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-19 after Phase 5)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Phase 6 (tier adapters) — plan 06-01 UNIFY complete (async seam + tier 1 transcript adapter). Tier 2 (OpenAI-compat video: local Qwen / hosted Gemini) is next (Plan 06-02). Tier 3 already ships. Phases 1–5 complete and merged to main.

## Current Position

Milestone: v0.1 Initial Release
Phase: 06-tier-adapters
Plan: 06-01 (async tier seam + tier 1 transcript adapter)
Status: 06-01 loop closed + merged (PR #7 → 5dbf603); Phase 6 in progress, 06-02 (tier-2 adapter) not yet planned
Last activity: 2026-06-19 — merged PR #7 (squash 5dbf603), synced main, archived consumed handoff; paused before planning 06-02.
Next action: /paul:plan for Phase 6 Plan 06-02 (tier-2 OpenAI-compatible video adapter)

Progress:
- Milestone: [█████░░░░░] ~56% (5 of ~9 phases complete)
- Phase 1: ✅ complete (PR #1 merged)
- Phase 2: ✅ complete (02-01; PR #2 merged)
- Phase 3: ✅ complete (03-01 + 03-02; PR #4 merged 2f9f669)
- Phase 4: ✅ complete (04-01 Router; PR #5 merged f9c558f; 64/64 green)
- Phase 5: ✅ complete (05-01; UNIFY closed; PR #6 merged d355a91; 73/73 green)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Phase 6 / tier-adapters: 06-01 loop closed → merge gate → 06-02 next]
```

## Accumulated Context

### Decisions
- WE own the sampling; the model end is a thin OpenAI-compatible adapter (local-vs-hosted is config, not code forks).
- Build the `watch` tool as the primitive first; the `/watch` command and batching wrap it.
- Qwen3-VL is the local tier-2 pick (real temporal architecture vs Gemma ≈ frames).
- No mandatory Gemini/cloud dependency; local-first on Apple Silicon (M4 Pro, 48 GB).
- (Phase 2) Toolchain = Vitest + TypeBox; one schema → static type + runtime validator.
- (Phase 2) `WatchedFrameSet` is tier-neutral; OpenAI `content[]` serialization isolated in `serialize.ts`.
- (Phase 3) Sampler backfill is gap-gated/cadence-aware (not flat fill-to-budget); budget cap uniformly subsamples scene cuts (never first-N truncation).
- (Phase 3) Sampler core is a pure decision layer; ffmpeg/ffprobe/transcript-fetch effects deferred to plan 03-02.
- (Phase 4) Router is a pure decision unit that emits an ordered tier chain ("route, don't answer"); the watch tool walks it + owns confidence-based escalation. Policy: spoken+transcript → [1,2,3]; else → [2,3]; on-screen-text → resolution "high"; every chain ends in tier 3.
- (Phase 5, checkpoint:decision) ExtensionAPI type source → option-a: real `@earendil-works/pi-coding-agent` types (not a hand-rolled shim). Placed in `peerDependencies: "*"` per docs/packages.md (pi-bundled package) + a devDep pin (^0.79.8) for local build/CI. Type-only import (erased under verbatimModuleSyntax); never enters runtime `dependencies`.
- (Phase 5) Tier 3 hands sampled frames to the orchestrator as pi tool-result ImageContent on a shared timeline; tier-runner.ts is pure/pi-free (local content union), extension.ts is the effect boundary. `watch` registered synchronously with mandatory promptSnippet; shipped via `pi.extensions` manifest.

### Deferred Issues
- Tier-3 batch via subagent fan-out (only needed for frames-for-many-videos).
- Optional Gemini tier-2 upgrade (only if a key is added).

### Blockers/Concerns
- RESOLVED (Phase 1): the print-mode "tool not found" symptom was the `pi-loadout` governor stripping newly-registered tools from the active set — not pi/-e/print. Custom-tool activation works in all modes. Phase-5 carry: ship `watch` as an installed package and ensure it's in the active loadout. See spikes/01-tool-activation/FINDINGS.md.

## Session Continuity

Last session: 2026-06-19 — 06-01 merged (PR #7 → 5dbf603), main synced, handoff archived; paused before planning 06-02
Stopped at: clean boundary — Phase 6 in progress, Plan 06-02 (tier-2 adapter) not yet planned
Next action: /paul:plan for Phase 6 Plan 06-02 (tier-2 OpenAI-compatible video adapter)
Resume file: .paul/HANDOFF-2026-06-19-phase6-plan02-tier2-ready.md
wip_result: skipped (only untracked .codegraph/ tooling cache; no lifecycle changes)
Resume context:
- Phase 6 = tier adapters: tier 1 (transcript) SHIPPED in 06-01; tier 3 (frames-into-context) already ships + live-verified. 06-02 implements tier 2 (OpenAI-compat video: local Qwen / hosted Gemini) behind the stable `TierRunner` seam in src/watch/tier-runner.ts by replacing the tier2Runner stub.
- Runners plug in by replacing the null stubs tier1Runner/tier2Runner in defaultRunners (null = escalate). REVISED in 06-01: the seam becomes async (`(args) => Promise<TierResult | null>`) and `extension.ts` must `await walkTierChain` — network I/O for tier 2 is unavoidably async, so the Phase-5 "no extension.ts change" note is superseded. Router chain policy: spoken+transcript → [1,2,3]; else → [2,3].
- We own sampling; tier-2 backends are thin OpenAI-compatible adapters (baseURL + model id), never code forks (AGENTS.md). Cloud (Gemini) optional, never required.
- Carries: (1) installed `watch` must be enabled in the active loadout or a setActiveTools governor strips it (FINDINGS #4); (2) DAVE — no .github/workflows/ci.yml yet; (3) DOCS — `typebox` could move to peerDependencies.
- State: on main (PR #7 merged → 5dbf603); suite 77/77 green; build+typecheck clean; 0 vulns; zero new deps. src/contract/*, src/sampler/*, src/router/* are stable — import, don't modify. No test/build ci.yml yet (DAVE).

### Git State
Last commit: 5dbf603 (Phase 6 (06-01): async tier seam + tier 1 transcript adapter (#7), on main)
Branch: main (synced 0/0 with origin/main); feature/06-tier-adapters merged + deleted
Feature branches merged: PR #1 (01), PR #2 (02), PR #3 (03-01 → 82aff62), PR #4 (03-02 → 2f9f669), PR #5 (04-01 → f9c558f), PR #6 (05-01 → d355a91), PR #7 (06-01 → 5dbf603)

---
*STATE.md — Updated after every significant action*
