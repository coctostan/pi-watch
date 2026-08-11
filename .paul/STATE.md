# Project State

## Project Reference

See: `.paul/PROJECT.md` (M4/v0.4 released baseline; ready for next milestone definition)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** Define the next milestone from the shipped v0.4 baseline and audit-routed follow-up.

## Current Position

Milestone: Awaiting next milestone (M4 — v0.4 — Listen Locally complete)
Version: v0.4.0
Phase: None active
Plan: None
Status: M4 / v0.4.0 complete and released — ready for next milestone
Last activity: 2026-08-11 — Merged M4 release reconciliation through PR #28, synchronized `main`, finalized release continuity, and created annotated tag `v0.4.0`; parent verification passes while isolated ambient-cache failure remains routed as F8/R22.
Next action: `/paul:discuss-milestone` to define the next milestone.

Progress:
- Milestone M4 / v0.4: [██████████] 100% ✓ (Phases 17–19, 3 plans, released v0.4.0)
- Milestone v0.3: [██████████] 100% ✓ (Phases 14–16, 3 plans)
- Milestone v0.2: [██████████] 100% ✓ (Phases 10–13)
- Milestone v0.1: [██████████] 100% ✓ (Phases 1–9)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [M4 complete — ready for next milestone]
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

### Deferred Issues

- Tier-3 batch fan-out for frames across many videos.
- Optional Gemini/cloud tier.
- Advanced ASR features: diarization, translation, subtitle export, streaming/live video, multilingual guarantees, long-media chunking, and service adapters.
- Optional resolver download filesize/duration caps beyond v0.4's ASR-specific policy if runtime evidence warrants them.
- Focused decomposition of `src/sampler/effects.ts` beyond work directly enabling bounded ASR.
- Dedicated CI workflow beyond Socket Security checks.
- Scoped npm package rename/publication; Git/local sources remain the supported distribution path.
- Audit-routed follow-up: R3 OCR resolution composition and transcript-before-frame cost path, R8 quoted `/watch` paths, R18 exported-boundary ASR ceilings, R22 hermetic package proof, and R4/R6 comment/terminology reconciliation.

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

Last session: 2026-08-11 — Completed and released M4 / v0.4.0 after adherence audit and GitHub Flow reconciliation.
Stopped at: M4 release complete; no phase or plan active.
Next action: `/paul:discuss-milestone` to define the next milestone.
Resume file: `.paul/MILESTONES.md`
Git state: M4 closure PR #28 merged; release-finalization commit merged to `main`; local `main` synchronized; annotated tag `v0.4.0` created and pushed.
Resume context:
- `.paul/audits/M4-AUDIT.md` is complete with R1–R22 verdicts, tagged-evidence/no-test-found records, all four document-health lenses, F1–F17 routes, and explicit author intent confirmation after final reconciliation.
- `.paul/archive/roadmap/v0.4.0-listen-locally.md` is authoritative completed phase 17–19 history; live ROADMAP is compact.
- Audit-routed R3/R4/R6/R8/R18/R22 work remains follow-up and is not represented as fixed.
- Parent verification passes with 248 tests / 3 skipped, typecheck, build, and `git diff --check`; isolated ambient npm-cache failure remains documented and routed through F8/R22.
- Version alignment is v0.4.0 across PROJECT, ROADMAP, STATE, package metadata, lock metadata, and release tag.

---
*STATE.md — Updated after every significant action*
