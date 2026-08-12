# Project State

## Project Reference

See: `.paul/PROJECT.md` (v0.4 released baseline; M5/v0.5 Transcript First active)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Phase 22 — stage transcript acquisition so successful tier-1 calls avoid scene detection and frame decoding, without weakening cleanup or fallback.

## Current Position

Milestone: M5 — v0.5 — Transcript First
Version: v0.5.0 (target)
Phase: 22 of 4 (Route before decoding)
Plan: Not started
Status: Ready to plan
Last activity: 2026-08-12 — Phase 21 complete: plan 21-01 unified with approved R5/roadmap amendments, module ledger/history rows, and Phase 22 transition writes.
Next action: `/paul:plan` for Phase 22

Progress:
- Milestone M5 / v0.5: [█████░░░░░] 50% implementation complete (Phases 20–21 complete; Phases 22–23 remain)
- Milestone M4 / v0.4: [██████████] 100% ✓ (Phases 17–19, 3 plans, released v0.4.0)
- Milestone v0.3: [██████████] 100% ✓ (Phases 14–16, 3 plans)
- Milestone v0.2: [██████████] 100% ✓ (Phases 10–13)
- Milestone v0.1: [██████████] 100% ✓ (Phases 1–9)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [M5 Phase 21 complete — ready to plan Phase 22]
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
- Local ASR executes configured `mlx_whisper` directly with hard duration/timeout/output bounds, validates unknown JSON in a pure core, owns only adapter-created output, and exposes typed diagnostics without refs, transcript text, stderr, or cache paths.
- External-model acceptance uses deterministic failure through the manifest-declared compiled registration by default; real `mlx_whisper` proof remains exact-opt-in, finite, default-skipped, and user-managed.
- M5 centers the deterministic, stateless transcript-efficiency path: normalize caption overlap, honor ranges, and acquire transcript evidence before expensive visual work.
- Persistent transcript handles and internal model-backed synthesis remain deferred pending measured M5 results; M5 adds no dependency or mandatory model/cloud path.
- Rolling captions normalize only exact case-sensitive overlap of at least three tokens between temporally overlapping adjacent raw cues; work is bounded at 4,096 prior-cue tokens, over-budget cues remain unchanged, and metrics stay corpus-scoped.
- One absolute half-open `[startMs, endMs)` range governs captions, eligible ASR, and frames; supported URL timestamps contribute start only as a valid conversion-safe singleton, explicit whole-second bounds win, and cue clipping preserves text/source.
- Returned coverage is computed only after internal, aggregate, and final output bounds, and stays fixed-size and free of refs, questions, or evidence text; available coverage is reported separately.

### Deferred Issues

- Tier-3 batch fan-out for frames across many videos.
- Optional Gemini/cloud tier.
- Advanced ASR features: diarization, translation, subtitle export, streaming/live video, multilingual guarantees, long-media chunking, and service adapters.
- Optional resolver download filesize/duration caps beyond v0.4's ASR-specific policy if runtime evidence warrants them.
- Focused decomposition of measured hotspots beyond Phase 20's caption-core extraction: `src/sampler/effects.ts` (642 lines), `src/watch/tier-runner.ts` (642), and `src/watch/extension.ts` (493).
- Dedicated CI workflow beyond Socket Security checks.
- Scoped npm package rename/publication; Git/local sources remain the supported distribution path.
- Audit-routed follow-up outside M5: R3 question-derived OCR resolution composition; M5 owns transcript-before-frame R3 plus R8, R18, R22, and R4/R6.

### Release Concerns

- Dependency maintenance remains separate work: the unchanged dev tree reports 0 critical / 4 high / 2 moderate advisories.
- The unscoped npm package name remains unavailable and must not be used for installation.

### Fixes

| Fix | Scope | Result |
|-----|-------|--------|
| Fix 01 (standard) | No active phase — bounded scene analysis for long-form video | Reduced 2 fps / 320px analysis; >10-minute and typed-timeout fallback to uniform frames; 201 tests pass; reported 19m20s URL succeeded in 7.959s. See `.paul/fixes/01-FIX-SUMMARY.md`. |
| Fix 02 (standard) | No active phase — Pi package/tool spec compliance | Wildcard core peers + pinned dev deps; Google-safe schemas; thrown host errors; aggregate 50 KB/2,000-line bounds; 210 tests pass; packed/local Pi live proofs pass. See `.paul/fixes/02-FIX-SUMMARY.md`. |
| Fix 03 (standard) | M4 milestone-close audit identifier repair; Chain: `R7 — no spec impact` | Recorded M4 consistently in STATE/ROADMAP and assigned stable PRD IDs R1–R15 without intent changes; 248 tests / 3 skipped, typecheck/build/diff pass, audit unchanged. See `.paul/phases/19-local-speech-ux-and-proof/19-02-FIX-SUMMARY.md`. |

## Session Continuity

Last session: 2026-08-12 — Unified Phase 21 plan 21-01 and executed the Phase 22 transition writes.
Stopped at: Phase 21 complete; ready to plan Phase 22.
Next action: `/paul:plan` for Phase 22
Resume file: `.paul/ROADMAP.md`
Git state: Phase 21 implementation and lifecycle artifacts ship through PR #32, which the UNIFY merge gate squash-merges into `main` with branch cleanup per config.
Resume context:
- Phase 21 evidence: TDD commits RED `2d60e73`, GREEN `7cdb778`, REFACTOR `0695c75`; UNIFY re-verified 309 passed / 3 skipped, typecheck, reproducible `dist/**`, and unchanged 0/4/2/0 audit.
- Approved UNIFY deltas: R5 amended in `.paul/PRD.md` for optional whole-second `start`/`end` bounds; the ROADMAP deferred-debt entry now names `tier-runner.ts` and `extension.ts` alongside `effects.ts`; the R6 coverage-metadata candidate was discarded without intent edit.
- Phase 22 must preserve Phase 21 range/coverage semantics while reordering transcript acquisition ahead of scene detection and frame decoding.

---
*STATE.md — Updated after every significant action*
