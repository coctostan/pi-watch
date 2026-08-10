# Project State

## Project Reference

See: `.paul/PROJECT.md` (v0.4 shipped baseline; milestone reconciliation/release remains)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** v0.4 — Listen Locally is phase-complete; reconcile the milestone and release/tag state after the Phase 19 PR merge.

## Current Position

Milestone: v0.4 — Listen Locally
Version: v0.4.0
Phase: 19 — Local speech UX and proof (3 of 3)
Plan: 19-01 — Complete
Status: Milestone phase work complete — GitHub Flow merge gate pending
Last activity: 2026-08-10 — Completed Phase 19 UNIFY reconciliation and transition preparation: all four acceptance criteria pass, no deltas or blockers remain, and v0.4 is 3 of 3 phases complete.
Next action: `/paul:milestone` to reconcile and complete v0.4 after the required PR merge gate.

Progress:
- Milestone v0.4: [██████████] 100% ✓ (Phases 17–19, 3 plans; milestone reconciliation pending)
- Milestone v0.3: [██████████] 100% ✓ (Phases 14–16, 3 plans)
- Milestone v0.2: [██████████] 100% ✓ (Phases 10–13)
- Milestone v0.1: [██████████] 100% ✓ (Phases 1–9)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Plan 19-01 and Phase 19 complete; merge gate pending]
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

### Release Concerns

- Dependency maintenance remains separate work: the unchanged dev tree reports 0 critical / 4 high / 2 moderate advisories.
- The unscoped npm package name remains unavailable and must not be used for installation.

### Fixes

| Fix | Scope | Result |
|-----|-------|--------|
| Fix 01 (standard) | No active phase — bounded scene analysis for long-form video | Reduced 2 fps / 320px analysis; >10-minute and typed-timeout fallback to uniform frames; 201 tests pass; reported 19m20s URL succeeded in 7.959s. See `.paul/fixes/01-FIX-SUMMARY.md`. |
| Fix 02 (standard) | No active phase — Pi package/tool spec compliance | Wildcard core peers + pinned dev deps; Google-safe schemas; thrown host errors; aggregate 50 KB/2,000-line bounds; 210 tests pass; packed/local Pi live proofs pass. See `.paul/fixes/02-FIX-SUMMARY.md`. |

## Session Continuity

Last session: 2026-08-10 — Completed Plan 19-01 reconciliation, module finalization, and Phase 19 transition preparation.
Stopped at: Phase 19 and all v0.4 phase work complete; GitHub Flow push/CI/merge/base-sync gate remains before milestone routing is exposed.
Next action: `/paul:milestone` to reconcile and complete v0.4 after the required PR merge gate.
Resume file: `.paul/phases/19-local-speech-ux-and-proof/19-01-SUMMARY.md`
phase_result: `.paul/phases/19-local-speech-ux-and-proof/19-01-SUMMARY.md` — AC-1 through AC-4 pass; no spec deltas or blockers
Git state: Phase 19 lifecycle transition prepared on `feature/19-local-speech-ux-and-proof`; PR #26 merge gate pending finalized UNIFY commit/push and CI recheck.
Resume context:
- Phase 19 shipped a 66,661-byte / 9.149-second synthetic English fixture and registered compiled-extension proof for private missing-executable diagnostics, tier-3 fallback, and an exact-opt-in live-ASR path.
- README and `docs/LOCAL-ASR-SETUP.md` now cover explicit setup, all configuration keys and typed failure remediation, ownership/privacy, bounded proof, limits, and supported Git/local installation.
- Final verification passed with 248 tests / 3 skipped, typecheck, build, package dry-run, unchanged `dist/**`, fixture/protected-scope/whitespace checks, and audit at 0 critical / 4 high / 2 moderate / 0 low.
- Post-unify WALT, SKIP, CODI, and RUBY evidence is durable in the SUMMARY; quality/CODI histories and the module ledger are updated.

---
*STATE.md — Updated after every significant action*
