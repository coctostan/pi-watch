# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-20 after Phase 8)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Phase 8 (`/watch` command) complete and merged (PR #10 → 0c26401) — the UX wrapper over the `watch` tool; the tool+command pairing is done. Next: Phase 9 (batching). Phases 1–8 complete and merged to main.

## Current Position

Milestone: v0.1 Initial Release
Phase: 09-batching
Plan: Not started
Status: Ready to plan — Phase 8 complete (08-01 merged; PR #10 → squash 0c26401; suite 117/117; main synced; branch deleted). Transitioned to Phase 9.
Last activity: 2026-06-20 — Phase 8 complete: 08-01 merged, main synced, feature branch deleted; PROJECT/STATE/ROADMAP advanced to Phase 9.
Next action: /paul:plan for Phase 9 (batching)

Progress:
- Milestone: [████████░░] ~89% (8 of ~9 phases complete)
- Phase 1: ✅ complete (PR #1 merged)
- Phase 2: ✅ complete (02-01; PR #2 merged)
- Phase 3: ✅ complete (03-01 + 03-02; PR #4 merged 2f9f669)
- Phase 4: ✅ complete (04-01 Router; PR #5 merged f9c558f; 64/64 green)
- Phase 5: ✅ complete (05-01; UNIFY closed; PR #6 merged d355a91; 73/73 green)
- Phase 6: ✅ complete (06-01 + 06-02; PR #7 + PR #8 merged 0bd585a; all 3 tiers; 93/93 green)
- Phase 7: ✅ complete (07-01 config surface; suite 105/105; PR #9 merged 7745f07)
- Phase 8: ✅ complete (08-01 /watch command; suite 117/117; PR #10 merged 0c26401)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Phase 8 complete + merged (PR #10 → 0c26401); Phase 9 not started — ready to /paul:plan]
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
- (Phase 7) Tool config = pure `resolveWatchConfig` over env + explicit overrides (precedence overrides > env > defaults), composed at the effect boundary; tier-2 fetch carries a configurable AbortSignal timeout (abort → null escalate).
- (Phase 8) The `/watch` command is a thin UX wrapper: pure parse/prompt/run core + injected effects (`ctx.ui.notify`, `pi.sendUserMessage`), `pi.registerCommand` synchronous alongside the tool. Decision (option-a): it DELEGATES to the agent rather than running the pipeline in the handler — the only path that preserves tier 3 (frames → orchestrator).

### Deferred Issues
- Tier-3 batch via subagent fan-out (only needed for frames-for-many-videos).
- Optional Gemini tier-2 upgrade (only if a key is added).

### Blockers/Concerns
- RESOLVED (Phase 1): the print-mode "tool not found" symptom was the `pi-loadout` governor stripping newly-registered tools from the active set — not pi/-e/print. Custom-tool activation works in all modes. Phase-5 carry: ship `watch` as an installed package and ensure it's in the active loadout. See spikes/01-tool-activation/FINDINGS.md.

## Session Continuity

Last session: 2026-06-20 — completed the Phase 8 PLAN→APPLY→UNIFY loop for 08-01 and the phase transition; PR #10 merged, main synced, branch deleted.
Stopped at: Phase 8 complete + merged; transitioned to Phase 9 (batching), ready to plan.
Next action: /paul:plan for Phase 9 (batching)
Resume file: .paul/ROADMAP.md
wip_result: n/a (loop closed; only untracked .codegraph/ cache)
Resume context:
- Phases 1–8 complete + merged. All three tiers real (transcript / OpenAI-compat video / frames-into-context) AND config-driven (`src/config/resolveWatchConfig`). The `watch` tool primitive AND the `/watch` command (UX wrapper, delegates to the agent) are both shipped — the tool+command pairing the project was built around is done.
- Phase 9 = batching (DESIGN §7 step 6): `Promise.all` over tiers 1/2 first; subagent fan-out for tier-3 batch only if/when needed. The sampler, router, all three tiers, config surface, tool, and command are all in place to batch over.
- We own sampling; tier-2 backends are thin OpenAI-compatible adapters (baseURL + model id), never code forks (AGENTS.md). Cloud (Gemini) optional, never required.
- Carries: (1) installed `watch`/`/watch` must be enabled in the active loadout or a setActiveTools governor strips it (FINDINGS #4); (2) DAVE — still no .github/workflows/ci.yml (merge gate is Socket-only) — consider a dedicated CI plan; (3) DOCS — `typebox` could move to peerDependencies; (4) deferred: file-based config + tier-order override (Phase 7), `/watch` budget/resolution flags + autocomplete (Phase 8).
- State: on main (PR #10 merged → 0c26401); suite 117/117 green; build+typecheck clean; 0 vulns; zero new deps. src/contract/*, src/sampler/*, src/router/*, src/watch/*, src/config/* are stable — import, don't modify casually.

### Git State
Last commit: 0c26401 (Phase 8: /watch command — UX wrapper over the watch tool (#10), on main)
Branch: main (synced 0/0 with origin/main); feature/08-watch-command merged + deleted
Feature branches merged: PR #1 (01), PR #2 (02), PR #3 (03-01 → 82aff62), PR #4 (03-02 → 2f9f669), PR #5 (04-01 → f9c558f), PR #6 (05-01 → d355a91), PR #7 (06-01 → 5dbf603), PR #8 (06-02 → 0bd585a), PR #9 (07-01 → 7745f07), PR #10 (08-01 → 0c26401)

---
*STATE.md — Updated after every significant action*
