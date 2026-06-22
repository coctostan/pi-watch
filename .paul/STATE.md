# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-20 after Phase 8)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Phase 8 (`/watch` command) complete and merged (PR #10 → 0c26401) — the UX wrapper over the `watch` tool; the tool+command pairing is done. Next: Phase 9 (batching). Phases 1–8 complete and merged to main.

## Current Position

Milestone: v0.1 Initial Release
Phase: 09-batching (complete)
Plan: 09-01 (UNIFY complete; PR #11 merged) — .paul/phases/09-batching/09-01-SUMMARY.md
Status: Milestone complete — v0.1 Initial Release finished. Phase 9 batching shipped (`watch_batch` + pure `runWatchBatch`), SUMMARY finalized, PR #11 squash-merged to main as 6bf2270, Socket checks passed, local main synced.
Last activity: 2026-06-22 — Phase 9 and v0.1 milestone completed: PR #11 merged (6bf2270); PROJECT/STATE/ROADMAP updated for v0.1 completion.
Next action: choose next milestone action: [1] Start next milestone | [2] Review accomplishments | [3] Pause here

Progress:
- Milestone: [██████████] 100% (9 of 9 phases complete)
- Phase 1: ✅ complete (PR #1 merged)
- Phase 2: ✅ complete (02-01; PR #2 merged)
- Phase 3: ✅ complete (03-01 + 03-02; PR #4 merged 2f9f669)
- Phase 4: ✅ complete (04-01 Router; PR #5 merged f9c558f; 64/64 green)
- Phase 5: ✅ complete (05-01; PR #6 merged d355a91; 73/73 green)
- Phase 6: ✅ complete (06-01 + 06-02; PR #7 + PR #8 merged 0bd585a; 93/93 green)
- Phase 7: ✅ complete (07-01 config surface; suite 105/105; PR #9 merged 7745f07)
- Phase 8: ✅ complete (08-01 /watch command; suite 117/117; PR #10 merged 0c26401)
- Phase 9: ✅ complete (09-01 batching; suite 125/125; PR #11 merged 6bf2270)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Phase 9 complete; v0.1 milestone complete]
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
- (Phase 9 checkpoint:decision) Batch surface = option-a: add a new `watch_batch` tool over a pure `runWatchBatch` core; tiers 1/2 aggregate into one bounded text result, tier-3 batch is deferred to single-video watch follow-up calls (no subagent fan-out in v0.1).

### Deferred Issues
- Tier-3 batch via subagent fan-out (only needed for frames-for-many-videos).
- Optional Gemini tier-2 upgrade (only if a key is added).

### Blockers/Concerns
- No current blockers. Carry for next milestone: dedicated CI workflow (merge gate is Socket-only), live pi runtime smoke for watch/watch_batch, tier-3 batch fan-out, richer command/config surfaces, optional TypeBox peer-dependency cleanup.

## Session Continuity

Last session: 2026-06-22 — Phase 9 UNIFY and v0.1 milestone completion. SUMMARY finalized; post-unify WALT/CODI history rows written; PR #11 merged to main as 6bf2270; PROJECT/STATE/ROADMAP updated for milestone completion.
Stopped at: v0.1 milestone complete; all 9 phases done; local main synced. Awaiting next milestone/review/pause choice.
Next action: [1] Start next milestone | [2] Review accomplishments | [3] Pause here
Resume file: .paul/phases/09-batching/09-01-SUMMARY.md
wip_result: unified (PR #11 merged 6bf2270; verification: typecheck/build clean, npm test 125/125, npm audit 0 vulns, Socket checks passed)
Resume context:
- v0.1 is complete: sampler contract, sampler implementation, router, `watch` tool primitive, tier adapters, config surface, `/watch` command, and `watch_batch` batching all shipped.
- We own sampling; tier-2 backends are thin OpenAI-compatible adapters (baseURL + model id), never code forks (AGENTS.md). Cloud (Gemini) optional, never required.
- Carries for future milestone: installed `watch`/`/watch` must be enabled in active loadout; add dedicated CI workflow; consider TypeBox peer-dep cleanup; deferred file-based config + tier-order override, `/watch` budget/resolution flags + autocomplete, `/watch-batch` command, and tier-3 subagent fan-out.

### Git State
Last commit: 6bf2270 (feat(09-01): add watch batching), on main
Branch: main (synced with origin/main); PR #11 merged → https://github.com/coctostan/pi-watch/pull/11; Socket checks passed
Feature branches merged: PR #1 (01), PR #2 (02), PR #3 (03-01 → 82aff62), PR #4 (03-02 → 2f9f669), PR #5 (04-01 → f9c558f), PR #6 (05-01 → d355a91), PR #7 (06-01 → 5dbf603), PR #8 (06-02 → 0bd585a), PR #9 (07-01 → 7745f07), PR #10 (08-01 → 0c26401), PR #11 (09-01 → 6bf2270)

---
*STATE.md — Updated after every significant action*
