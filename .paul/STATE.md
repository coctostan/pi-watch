# Project State

## Project Reference

See: `.paul/PROJECT.md` (v0.3 shipped baseline; v0.4 active scope is in `.paul/ROADMAP.md`)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** v0.4 — Listen Locally: bounded, explicitly enabled local ASR for English speech when captions are unavailable.

## Current Position

Milestone: v0.4 — Listen Locally
Version: v0.4.0
Phase: 18 — Local transcript fallback (2 of 3)
Plan: 18-01 — Bounded captions-first local ASR fallback
Status: Applied — awaiting UNIFY
Last activity: 2026-08-10 — Completed Phase 18 APPLY with bounded captions-first local ASR, verification, and PR #24.
Next action: `/paul:unify .paul/phases/18-local-transcript-fallback/18-01-PLAN.md`.

Progress:
- Milestone v0.4: [███░░░░░░░] 33% (1 of 3 phases complete)
- Milestone v0.3: [██████████] 100% ✓ (Phases 14–16, 3 plans)
- Milestone v0.2: [██████████] 100% ✓ (Phases 10–13)
- Milestone v0.1: [██████████] 100% ✓ (Phases 1–9)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ○     [Phase 18 plan 18-01 ready to unify]
```

## Accumulated Context

### Validated Product Decisions

- We own sampling; model backends remain thin, swappable OpenAI-compatible adapters (`baseURL` + model id).
- Choose the cheapest tier that answers the question: transcript first, native video second, sampled frames as the universal fallback.
- Keep cloud providers optional and the default path local-first/network-free.
- The `watch` tool is the primitive; `/watch` and `watch_batch` wrap or delegate to it.
- Supported YouTube refs preserve separate caller `originalRef` and local `mediaRef`; only resolver-created storage is owned and removable.
- External media/caption processes use bounded argv-only execution with `--ignore-config`; caption failures degrade to visual tiers without fabricated text.
- Human captions are preferred with one automatic-caption fallback; caption reads and shared-timeline assembly remain explicitly bounded.
- Pi Git/local installation uses committed exact `dist/**` output because dev-only build tooling is unavailable in Pi-equivalent production installs.
- Use Git/local Pi package sources; the unscoped `npm:pi-watch` registry package is unrelated.
- Live model and YouTube proofs stay opt-in, finite-timeout, and default-skipped so normal tests remain deterministic/offline.
- Pi-bundled runtime packages remain wildcard peers per Pi package guidance, with pinned development dependencies for reproducible local verification.
- Apply text limits after final tool-result composition; reserve required trailing guidance, use UTF-8-safe question prefixes, and keep frame-label/image pairs atomic.
- v0.4 local speech coverage uses explicitly enabled, on-demand `mlx-whisper` on Apple Silicon; executable and model choices remain configurable.
- Captions remain preferred; ASR runs only for speech-oriented questions when captions are absent, uses a configurable hard duration cap, and degrades to visual tiers on every failure.

### Deferred Issues

- Tier-3 batch fan-out for frames across many videos.
- Optional Gemini/cloud tier.
- Advanced ASR features: diarization, translation, subtitle export, streaming/live video, multilingual guarantees, long-media chunking, and service adapters.
- Optional resolver download filesize/duration caps beyond v0.4's ASR-specific policy if runtime evidence warrants them.
- Focused decomposition of `src/sampler/effects.ts` beyond work directly enabling bounded ASR.
- Dedicated CI workflow beyond Socket Security checks.
- Scoped npm package rename/publication; Git/local sources remain the supported distribution path.

### Release Concerns

- Dependency maintenance remains separate work: the unchanged dev tree reports 0 critical / 4 high / 2 moderate advisories.
- The unscoped npm package name remains unavailable and must not be used for installation.

### Fixes

| Fix | Scope | Result |
|-----|-------|--------|
| Fix 01 (standard) | No active phase — bounded scene analysis for long-form video | Reduced 2 fps / 320px analysis; >10-minute and typed-timeout fallback to uniform frames; 201 tests pass; reported 19m20s URL succeeded in 7.959s. See `.paul/fixes/01-FIX-SUMMARY.md`. |
| Fix 02 (standard) | No active phase — Pi package/tool spec compliance | Wildcard core peers + pinned dev deps; Google-safe schemas; thrown host errors; aggregate 50 KB/2,000-line bounds; 210 tests pass; packed/local Pi live proofs pass. See `.paul/fixes/02-FIX-SUMMARY.md`. |

## Session Continuity

Last session: 2026-08-10 — Completed Phase 18 APPLY.
Stopped at: Plan 18-01 implementation and APPLY verification complete; UNIFY not started.
Next action: `/paul:unify .paul/phases/18-local-transcript-fallback/18-01-PLAN.md`.
Resume file: `.paul/phases/18-local-transcript-fallback/18-01-PLAN.md`
wip_result: not needed — RED and GREEN task commits pushed to the feature branch
Git state: `feature/18-local-transcript-fallback` is 0 behind / 2 ahead `origin/main`; PR #24 open; Socket Security in progress.
Resume context:
- RED commit `7dd5d41` captured expected parser/config/sampler/extension failures before production edits; GREEN commit `60d5310` passes all focused contracts.
- Full verification passed: 245 tests / 2 skipped, typecheck, reproducible build, package dry-run, protected-file diff, whitespace, and no residual ASR temp storage.
- Dependency audit is unchanged at 0 critical / 4 high / 2 moderate; post-apply WALT, DEAN, and TODD enforcement passed.
- PR #24 is open at `https://github.com/coctostan/pi-watch/pull/24`; CI was in progress when APPLY completed.

---
*STATE.md — Updated after every significant action*
