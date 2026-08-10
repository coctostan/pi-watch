# Project State

## Project Reference

See: `.paul/PROJECT.md` (v0.4 shipped baseline; milestone reconciliation/release remains)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** v0.4 — Listen Locally is phase-complete; merge the bounded PALS identifier repair, then resume milestone adherence audit and release reconciliation.

## Current Position

Milestone: M4 — v0.4 — Listen Locally
Version: v0.4.0
Phase: 19 — Local speech UX and proof (3 of 3)
Plan: 19-01 — Complete
Status: Milestone phase work complete — Fix 03 GitHub Flow merge gate pending
Last activity: 2026-08-10 — Completed standard Fix 03: recorded v0.4 as M4 and assigned stable R1–R15 identifiers without changing requirement intent; 248 tests / 3 skipped, typecheck, build, diff, and dependency audit gates pass.
Next action: Complete the Fix 03 PR merge gate, sync `main`, then resume `/paul:milestone` for the mandatory M4 adherence audit.

Progress:
- Milestone v0.4: [██████████] 100% ✓ (Phases 17–19, 3 plans; milestone reconciliation pending)
- Milestone v0.3: [██████████] 100% ✓ (Phases 14–16, 3 plans)
- Milestone v0.2: [██████████] 100% ✓ (Phases 10–13)
- Milestone v0.1: [██████████] 100% ✓ (Phases 1–9)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Plan 19-01 and Phase 19 complete; Fix 03 merge gate pending]
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
| Fix 03 (standard) | M4 milestone-close audit identifier repair; Chain: `R7 — no spec impact` | Recorded M4 consistently in STATE/ROADMAP and assigned stable PRD IDs R1–R15 without intent changes; 248 tests / 3 skipped, typecheck/build/diff pass, audit unchanged. See `.paul/phases/19-local-speech-ux-and-proof/19-02-FIX-SUMMARY.md`. |

## Session Continuity

Last session: 2026-08-10 — Completed standard Fix 03 and all post-apply/post-unify module reconciliation.
Stopped at: Fix 03 complete on `fix/03-pals-audit-identifiers`; GitHub Flow push/CI/merge/base-sync gate remains before M4 milestone-close audit resumes.
Next action: Complete the Fix 03 PR merge gate, sync `main`, then resume `/paul:milestone`.
Resume file: `.paul/phases/19-local-speech-ux-and-proof/19-02-FIX-SUMMARY.md`
fix_result: `.paul/phases/19-local-speech-ux-and-proof/19-02-FIX-SUMMARY.md` — M4 and R1–R15 identifiers are canonical; product intent and the main loop are unchanged
Git state: Fix 03 prepared on `fix/03-pals-audit-identifiers`; push/PR/CI/merge/base-sync gate pending.
Resume context:
- STATE and ROADMAP now identify the current milestone as M4 — v0.4 — Listen Locally.
- PRD now assigns exactly one stable identifier each to R1–R15 in existing requirement order and buckets, with no wording or intent change.
- Verification passed with 248 tests / 3 skipped, typecheck, build, unchanged `dist/**`, whitespace checks, and audit at 0 critical / 4 high / 2 moderate / 0 low.
- Post-unify WALT, SKIP, CODI, and RUBY evidence is durable in the Fix 03 SUMMARY; quality and CODI histories are updated.

---
*STATE.md — Updated after every significant action*
