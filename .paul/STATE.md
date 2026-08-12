# Project State

## Project Reference

See: `.paul/PROJECT.md` (v0.4 released baseline; M5/v0.5 Transcript First active)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Phase 21 — honor supported timestamps and explicit ranges across normalized transcript, eligible ASR, and visual fallback evidence.

## Current Position

Milestone: M5 — v0.5 — Transcript First
Version: v0.5.0 (target)
Phase: 21 of 4 (Range-aware evidence)
Plan: Not started
Status: Ready to plan
Last activity: 2026-08-12 — Unified Phase 20 plan 20-01, passed the PR #30 checks, squash-merged as `d731e28`, synced `main`, and completed configured feature-branch cleanup.
Next action: `/paul:plan` for Phase 21.

Progress:
- Milestone M5 / v0.5: [██░░░░░░░░] 25% (Phase 20 complete; Phases 21–23 remain)
- Milestone M4 / v0.4: [██████████] 100% ✓ (Phases 17–19, 3 plans, released v0.4.0)
- Milestone v0.3: [██████████] 100% ✓ (Phases 14–16, 3 plans)
- Milestone v0.2: [██████████] 100% ✓ (Phases 10–13)
- Milestone v0.1: [██████████] 100% ✓ (Phases 1–9)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [M5 Phase 21 — ready to plan]
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

### Deferred Issues

- Tier-3 batch fan-out for frames across many videos.
- Optional Gemini/cloud tier.
- Advanced ASR features: diarization, translation, subtitle export, streaming/live video, multilingual guarantees, long-media chunking, and service adapters.
- Optional resolver download filesize/duration caps beyond v0.4's ASR-specific policy if runtime evidence warrants them.
- Focused decomposition of `src/sampler/effects.ts` beyond Phase 20's caption-core extraction; the reduced file remains a measured hotspot.
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

Last session: 2026-08-12 — Unified Phase 20 plan 20-01, merged PR #30, synced `main`, and completed branch cleanup.
Stopped at: Phase 20 is complete and merged; Phase 21 is ready to plan.
Next action: `/paul:plan` for Phase 21.
Resume file: `.paul/ROADMAP.md`
Git state: Phase PR #30 MERGED as `d731e28`; `main` synced with `origin/main`; `feature/20-normalize-and-measure` deleted locally/remotely; closure snapshot reconciled through a follow-up GitHub Flow update.
Resume context:
- Phase 20 AC-1 through AC-3 are PASS; SUMMARY: `.paul/phases/20-normalize-and-measure/20-01-SUMMARY.md`.
- The synthetic corpus measures 301 raw to 235 normalized UTF-8 bytes and 12 to 0 known duplicate tokens under exact adjacent temporal overlap and a 4,096-token work bound.
- Post-unify WALT, SKIP, CODI, and RUBY reports are durable; no module blocked and Spec Deltas records `No deltas`.
- The consumed handoff is archived, and accidental `.codegraph/graph.db` tracking from WIP `04c97ad` is removed from PR scope while the local cache remains untracked.
- Phase 21 owns supported timestamp/start/end range behavior, coverage/truncation metadata, and unchanged transcript/ASR/visual fallback guarantees.

---
*STATE.md — Updated after every significant action*
