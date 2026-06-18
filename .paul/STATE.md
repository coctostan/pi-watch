# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-06-18 10:13:09)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Phase 5 (watch tool primitive) — ready to plan. Wire video ref + question → sample() → route() → walk the tier chain → answer. Phases 1–4 complete and merged to main.

## Current Position

Milestone: v0.1 Initial Release
Phase: 05-watch-tool-primitive
Plan: Not started
Status: Ready to plan
Last activity: 2026-06-18 — Phase 4 complete (04-01 Router unified, PR #5 merged f9c558f); transitioned to Phase 5
Next action: /paul:plan (Phase 5 — watch tool primitive: ref + question → sample() → route() → answer)

Progress:
- Milestone: [████░░░░░░] ~44% (4 of ~9 phases complete)
- Phase 1: ✅ complete (PR #1 merged)
- Phase 2: ✅ complete (02-01; PR #2 merged)
- Phase 3: ✅ complete (03-01 + 03-02; PR #4 merged 2f9f669)
- Phase 4: ✅ complete (04-01 Router; PR #5 merged f9c558f; 64/64 green)
- Phase 5: watch tool primitive — not started

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Phase 5: not started → /paul:plan next]
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

### Deferred Issues
- Tier-3 batch via subagent fan-out (only needed for frames-for-many-videos).
- Optional Gemini tier-2 upgrade (only if a key is added).

### Blockers/Concerns
- RESOLVED (Phase 1): the print-mode "tool not found" symptom was the `pi-loadout` governor stripping newly-registered tools from the active set — not pi/-e/print. Custom-tool activation works in all modes. Phase-5 carry: ship `watch` as an installed package and ensure it's in the active loadout. See spikes/01-tool-activation/FINDINGS.md.

## Session Continuity

Last session: 2026-06-18 — Phase 4 complete + transitioned to Phase 5
Stopped at: Phase 4 (Router) closed end-to-end — 04-01 unified, PR #5 merged (f9c558f), phase transition done (PROJECT/ROADMAP/STATE evolved, handoff archived)
Next action: /paul:plan (Phase 5 — watch tool primitive)
Resume file: .paul/ROADMAP.md
Resume context:
- Phases 1–4 complete and merged to main (suite 64/64 green; 0 vulns; no runtime deps beyond typebox). On main, synced 0/0, no open PRs.
- The two surfaces Phase 5 wraps: `sample(opts)` → validated `WatchedFrameSet` (src/sampler), and `route({question, context})` → `RoutingDecision` with an ordered `tiers` chain (src/router). Bridge: `routeContextFromSet(set)` → `RouteContext`.
- Phase 5 (watch tool primitive): wire a video ref + question → sample() → routeContextFromSet → route() → walk the tier chain → answer, exposed as a pi custom tool. ⚠️ Carry the Phase-1 activation finding: ship `watch` as an installed package + ensure it's in the active loadout (a setActiveTools governor strips ad-hoc/-e tools). Tier *adapters* themselves are Phase 6 — Phase 5 may need a thin seam/stub to return an answer; clarify scope at plan time.
- Import, don't modify: src/contract/*, src/sampler/*, src/router/* are stable surfaces. Transcript still ships "none" (best-effort) until a real caption/Whisper plan lands.
- DAVE advisory carry: still no .github/workflows/ci.yml — only Socket Security runs on PRs. Consider adding CI as a separate change.

### Git State
Last commit: f9c558f (Phase 04 Router PR #5 squash-merge, on main)
Branch: main (synced 0/0; no open PRs)
Feature branches merged: PR #1 (01), PR #2 (02), PR #3 (03-01 → 82aff62), PR #4 (03-02 → 2f9f669), PR #5 (04-01 → f9c558f)

---
*STATE.md — Updated after every significant action*
