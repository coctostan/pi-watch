# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-19 after Phase 7)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Phase 7 (config surface) complete and merged (PR #9 → 7745f07) — typed config replaces the tier-2 env bridge; tier-2 fetch timeout added. Next: Phase 8 (`/watch` command). Phases 1–7 complete and merged to main.

## Current Position

Milestone: v0.1 Initial Release
Phase: 08-watch-command
Plan: 08-01 (UNIFY complete) — `.paul/phases/08-watch-command/08-01-SUMMARY.md`
Status: UNIFY done — `/watch` command shipped + reconciled (AC-1/2/3 PASS; option-a decision recorded). Suite 117/117; typecheck+build clean; npm audit 0 vulns; 0 new deps. Awaiting merge gate: PR #10 (CI Socket-Security).
Last activity: 2026-06-20 — /paul:unify 08-01: SUMMARY written, STATE/ROADMAP advanced; ready for merge gate on PR #10.
Next action: complete merge gate for PR #10 (CI pass → merge → sync main → delete branch), then phase transition

Progress:
- Milestone: [███████░░░] ~78% (7 of ~9 phases complete)
- Phase 1: ✅ complete (PR #1 merged)
- Phase 2: ✅ complete (02-01; PR #2 merged)
- Phase 3: ✅ complete (03-01 + 03-02; PR #4 merged 2f9f669)
- Phase 4: ✅ complete (04-01 Router; PR #5 merged f9c558f; 64/64 green)
- Phase 5: ✅ complete (05-01; UNIFY closed; PR #6 merged d355a91; 73/73 green)
- Phase 6: ✅ complete (06-01 + 06-02; PR #7 + PR #8 merged 0bd585a; all 3 tiers; 93/93 green)
- Phase 7: ✅ complete (07-01 config surface; suite 105/105; PR #9 merged 7745f07)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Phase 8 (08-01) loop closed; suite 117/117; merge gate pending on PR #10]
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

Last session: 2026-06-20 — ran /paul:apply for Phase 8 (08-01); Task-1 decision → option-a; Tasks 2–3 PASS; PR #10 opened.
Stopped at: Phase 8 APPLY complete (PLAN ✓ / APPLY ✓ / UNIFY ○); on feature/08-watch-command (pushed); PR #10 open, CI Socket-Security in progress.
Next action: /paul:unify .paul/phases/08-watch-command/08-01-PLAN.md (writes SUMMARY + metadata commit, then merge-gate PR #10)
Resume file: .paul/phases/08-watch-command/08-01-PLAN.md
wip_result: n/a (loop closed; only untracked .codegraph/ cache)
Resume context:
- Phases 1–7 complete + merged. All three tiers real (transcript / OpenAI-compat video / frames-into-context) AND config-driven: `src/config/resolveWatchConfig` resolves a typed `WatchConfig` (tier-2 endpoint, budget, resolution, fetch timeout) with precedence overrides > env > defaults; the extension boundary builds a config-driven tier-2 runner and applies budget/resolution defaults under per-call `WATCH_PARAMS`.
- Phase 8 = `/watch` command (SHIPPED in APPLY): pure core `src/watch/command.ts` (parse + prompt + effect-injected runner) + `pi.registerCommand("watch", …)` in the extension boundary. Decision option-a: the command DELEGATES to the agent via `pi.sendUserMessage` rather than running the pipeline inline — a handler returns void and can only notify text, so delegation is the only path that preserves tier-3 (frames → orchestrator, DESIGN §5 #1). Budget/resolution flags + autocomplete deferred to a later phase.
- We own sampling; tier-2 backends are thin OpenAI-compatible adapters (baseURL + model id), never code forks (AGENTS.md). Cloud (Gemini) optional, never required.
- Carries: (1) installed `watch`/`/watch` must be enabled in the active loadout or a setActiveTools governor strips it (FINDINGS #4); (2) DAVE — still no .github/workflows/ci.yml (merge gate is Socket-only) — consider a dedicated CI plan; (3) DOCS — `typebox` could move to peerDependencies; (4) deferred: file-based config + tier-order override (Phase-7 decision).
- State: on main (PR #9 merged → 7745f07); suite 105/105 green; build+typecheck clean; 0 vulns; zero new deps. src/contract/*, src/sampler/*, src/router/*, src/watch/*, src/config/* are stable — import, don't modify casually.

### Git State
Last commit: 7745f07 (Phase 7: typed config surface + tier-2 fetch timeout (#9), on main)
Branch: main (synced 0/0 with origin/main); feature/07-config-surface merged + deleted
Feature branches merged: PR #1 (01), PR #2 (02), PR #3 (03-01 → 82aff62), PR #4 (03-02 → 2f9f669), PR #5 (04-01 → f9c558f), PR #6 (05-01 → d355a91), PR #7 (06-01 → 5dbf603), PR #8 (06-02 → 0bd585a), PR #9 (07-01 → 7745f07)

---
*STATE.md — Updated after every significant action*
