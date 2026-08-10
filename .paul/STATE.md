# Project State

## Project Reference

See: `.paul/PROJECT.md` (v0.3 shipped baseline; v0.4 active scope is in `.paul/ROADMAP.md`)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** v0.4 — Listen Locally: Phase 19 setup and diagnostics UX, deterministic English fixtures, bounded live proof, and installed end-to-end validation.

## Current Position

Milestone: v0.4 — Listen Locally
Version: v0.4.0
Phase: 19 — Local speech UX and proof (3 of 3)
Plan: 19-01 — Local speech operability and installed proof
Status: APPLY complete — ready for UNIFY
Last activity: 2026-08-10 — Completed Plan 19-01 APPLY with a bounded synthetic English fixture, compiled registered-tool fallback/default-skipped live proof, local-ASR setup and diagnostic UX, and v0.4.0 package metadata reconciliation; all required checks passed and PR #26 is open.
Next action: `/paul:unify .paul/phases/19-local-speech-ux-and-proof/19-01-PLAN.md`.

Progress:
- Milestone v0.4: [███████░░░] 67% (2 of 3 phases complete)
- Milestone v0.3: [██████████] 100% ✓ (Phases 14–16, 3 plans)
- Milestone v0.2: [██████████] 100% ✓ (Phases 10–13)
- Milestone v0.1: [██████████] 100% ✓ (Phases 1–9)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ○     [Plan 19-01 APPLY complete; awaiting UNIFY]
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

Last session: 2026-08-10 — Completed and parent-verified both Plan 19-01 APPLY tasks; UNIFY has not started.
Stopped at: APPLY complete with task commits pushed and PR #26 open; no implementation blockers.
Next action: `/paul:unify .paul/phases/19-local-speech-ux-and-proof/19-01-PLAN.md`.
Resume file: `.paul/phases/19-local-speech-ux-and-proof/19-01-PLAN.md`
wip_result: not needed — task commits `d6a5466` and `fded72d` are pushed on the feature branch
Git state: `feature/19-local-speech-ux-and-proof`, 0 behind / 2 ahead `origin/main`; PR #26 open at `https://github.com/coctostan/pi-watch/pull/26`; no CI checks reported.
Resume context:
- Task 1 committed a 66,661-byte / 9.149-second synthetic English fixture and manifest plus compiled registered-tool AC-1/AC-2 proof; AC-3 remains exact-opt-in and default-skipped because no user-managed global executable was supplied.
- Task 2 added `docs/LOCAL-ASR-SETUP.md`, refreshed README local-speech/install UX, reconciled only root package/lock versions to 0.4.0, and added AC-4 packed-extension/docs invariants.
- Parent verification passed: 248 tests / 3 skipped, typecheck, build, package dry-run, unchanged `dist/**`, whitespace, fixture bounds/hash/probe, protected-file scope, and audit at 0 critical / 4 high / 2 moderate / 0 low with no dependency-tree delta.
- Post-apply advisory and enforcement dispatches completed with no blockers; WALT, DEAN, and TODD passed.

---
*STATE.md — Updated after every significant action*
