# Project State

## Project Reference

See: `.paul/PROJECT.md` (v0.3 shipped baseline; v0.4 active scope is in `.paul/ROADMAP.md`)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** v0.4 — Listen Locally: Phase 19 setup and diagnostics UX, deterministic English fixtures, bounded live proof, and installed end-to-end validation.

## Current Position

Milestone: v0.4 — Listen Locally
Version: v0.4.0
Phase: 19 — Local speech UX and proof (3 of 3)
Plan: Not started
Status: Ready to plan
Last activity: 2026-08-10 — Completed Phase 18 UNIFY, merged PR #24 with passing CI, synchronized `main`, and unlocked Phase 19 planning.
Next action: `/paul:plan` for Phase 19.

Progress:
- Milestone v0.4: [███████░░░] 67% (2 of 3 phases complete)
- Milestone v0.3: [██████████] 100% ✓ (Phases 14–16, 3 plans)
- Milestone v0.2: [██████████] 100% ✓ (Phases 10–13)
- Milestone v0.1: [██████████] 100% ✓ (Phases 1–9)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Phase 18 complete; Phase 19 ready to plan]
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

Last session: 2026-08-10 — Completed Phase 18 UNIFY and GitHub Flow merge gate.
Stopped at: Phase 18 complete and merged; Phase 19 ready to plan.
Next action: `/paul:plan` for Phase 19.
Resume file: `.paul/ROADMAP.md`
phase_result: `.paul/phases/18-local-transcript-fallback/18-01-SUMMARY.md` — all acceptance criteria pass; no spec deltas or blockers
Git state: PR #24 merged with both Socket Security checks passing; local `main` synchronized with `origin/main`; Phase 18 feature branch deleted.
Resume context:
- Phase 18 shipped bounded captions-first local ASR with exact opt-in, spoken-only eligibility, direct argv execution, hard bounds, private diagnostics, narrow ownership, and visual fallback on every failure.
- Final verification passed: 245 tests / 2 skipped, typecheck, reproducible build, package dry-run, protected-file checks, whitespace, cleanup, and unchanged audit counts of 0 critical / 4 high / 2 moderate.
- Post-unify WALT, SKIP, CODI, and RUBY reports are durable in the SUMMARY; WALT/CODI histories and the module ledger were updated.
- Phase 19 is the final v0.4 phase and remains TBD until `/paul:plan`; setup/diagnostics UX, fixtures, bounded live proof, and installed validation are its declared focus.

---
*STATE.md — Updated after every significant action*
