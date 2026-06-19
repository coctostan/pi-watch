# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-19 after Phase 6)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Phase 6 (tier adapters) complete and merged (all three tiers real). Next: Phase 7 (config surface) — typed baseURL/model/tier-order/budget config replacing the tier-2 env bridge. Phases 1–6 complete and merged to main.

## Current Position

Milestone: v0.1 Initial Release
Phase: 07-config-surface
Plan: 07-01 (config surface) — UNIFY complete (SUMMARY written); merge gate pending
Status: UNIFY ✓ — AC-1/2/3 all PASS; 07-01-SUMMARY.md written. Typed config surface replaces the WATCH_TIER2_* env bridge; tier-2 fetch AbortSignal timeout added (PETE carry closed). Suite 105/105; 0 vulns; 0 new deps. PR #9 CI passing (Socket).
Last activity: 2026-06-19 — /paul:unify reconciled 07-01 (SUMMARY + lifecycle writes); proceeding to GitHub Flow merge gate.
Next action: Merge PR #9, then transition Phase 7 → Phase 8

Progress:
- Milestone: [██████░░░░] ~67% (6 of ~9 phases complete)
- Phase 1: ✅ complete (PR #1 merged)
- Phase 2: ✅ complete (02-01; PR #2 merged)
- Phase 3: ✅ complete (03-01 + 03-02; PR #4 merged 2f9f669)
- Phase 4: ✅ complete (04-01 Router; PR #5 merged f9c558f; 64/64 green)
- Phase 5: ✅ complete (05-01; UNIFY closed; PR #6 merged d355a91; 73/73 green)
- Phase 6: ✅ complete (06-01 + 06-02; PR #7 + PR #8 merged 0bd585a; all 3 tiers; 93/93 green)
- Phase 7: ✅ complete (07-01 config surface; suite 105/105; PR #9 — merging)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [UNIFY reconciled; SUMMARY written; merge gate + phase transition next]
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

Last session: 2026-06-19 — /paul:plan for Phase 7: wrote 07-01-PLAN.md (typed config surface + tier-2 fetch timeout)
Stopped at: Phase 7 plan created and awaiting review/approval; on main (synced 0/0); no feature branch yet
Next action: Review 07-01-PLAN.md, then /paul:apply (Task 1 is a decision checkpoint: config source/precedence + module placement)
Resume file: .paul/phases/07-config-surface/07-01-PLAN.md
wip_result: skipped (clean tree; only untracked .codegraph/ cache)
Resume context:
- Phase 6 = tier adapters DONE: tier 1 (transcript, 06-01), tier 2 (OpenAI-compat video, 06-02 — src/watch/tier2.ts), tier 3 (frames-into-context) all implemented. `watch` answers via the cheapest tier or escalates to tier 3.
- Phase 7 = config surface: replace the tier-2 env bridge (`resolveTier2ConfigFromEnv`, `WATCH_TIER2_*`) with a typed config (baseURL/model id/tier order/frame budget/resolution thresholds, optional API key, fetch timeout/AbortSignal). The adapter already takes a `Tier2Config`, so the seam is `createTier2Runner({ config })`.
- We own sampling; tier-2 backends are thin OpenAI-compatible adapters (baseURL + model id), never code forks (AGENTS.md). Cloud (Gemini) optional, never required.
- Carries: (1) installed `watch` must be enabled in the active loadout or a setActiveTools governor strips it (FINDINGS #4); (2) DAVE — still no .github/workflows/ci.yml (merge gate is Socket-only); (3) PETE — tier-2 `fetch` has no timeout/abort (fold into Phase-7 config); (4) DOCS — `typebox` could move to peerDependencies.
- State: on main (PR #8 merged → 0bd585a); suite 93/93 green; build+typecheck clean; 0 vulns; zero new deps. src/contract/*, src/sampler/*, src/router/*, src/watch/* are stable — import, don't modify casually.

### Git State
Last commit: 0bd585a (Phase 6 (06-02): tier-2 OpenAI-compatible video adapter (#8), on main)
Branch: main (synced 0/0 with origin/main); feature/06-02-tier2-adapter merged + deleted
Feature branches merged: PR #1 (01), PR #2 (02), PR #3 (03-01 → 82aff62), PR #4 (03-02 → 2f9f669), PR #5 (04-01 → f9c558f), PR #6 (05-01 → d355a91), PR #7 (06-01 → 5dbf603), PR #8 (06-02 → 0bd585a)

---
*STATE.md — Updated after every significant action*
