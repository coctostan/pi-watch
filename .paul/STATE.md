# Project State

## Project Reference

See: `.paul/PROJECT.md` (v0.3 shipped baseline; v0.4 active scope is in `.paul/ROADMAP.md`)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** v0.4 — Listen Locally: bounded, explicitly enabled local ASR for English speech when captions are unavailable.

## Current Position

Milestone: v0.4 — Listen Locally
Version: v0.4.0
Phase: 17 — Bounded ASR foundation (1 of 3)
Plan: 17-01 (`.paul/phases/17-bounded-asr-foundation/17-01-PLAN.md`)
Status: APPLY complete — ready to unify
Last activity: 2026-08-09 — Completed Plan 17-01 runtime research, bounded baseline, and implementation-boundary decision; opened PR #23.
Next action: `/paul:unify .paul/phases/17-bounded-asr-foundation/17-01-PLAN.md`.

Progress:
- Milestone v0.4: [░░░░░░░░░░] 0% (Phases 17–19)
- Milestone v0.3: [██████████] 100% ✓ (Phases 14–16, 3 plans)
- Milestone v0.2: [██████████] 100% ✓ (Phases 10–13)
- Milestone v0.1: [██████████] 100% ✓ (Phases 1–9)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ○     [APPLY complete — ready to unify]
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

Last session: 2026-08-09 — Completed APPLY for Phase 17 Plan 17-01 on `feature/17-bounded-asr-foundation`.
Stopped at: All three research tasks and post-APPLY gates passed; PR #23 is open and UNIFY is required.
Next action: `/paul:unify .paul/phases/17-bounded-asr-foundation/17-01-PLAN.md`.
Resume file: `.paul/phases/17-bounded-asr-foundation/17-01-RESEARCH.md`
Resume context:
- Observed `mlx-whisper 0.4.3` with stable JSON segment timestamps; the global executable was absent, while temporary `uvx` probing succeeded and was fully cleaned.
- One 9.696-second `mlx-community/whisper-tiny` fixture ran in 5,957 ms cold and 1,158 ms warm, produced a 1,247-byte JSON transcript, and passed timestamp/content checks.
- Selected extension-boundary spoken-intent gating with captions-first → ASR-second sampler composition, focused `src/sampler/asr.ts`, explicit opt-in, direct external executable ownership, and visual degradation on every failure.
- Final gates: 210 tests passed / 2 skipped; typecheck/build passed; audit unchanged at 0 critical / 4 high / 2 moderate; production/dependency/generated files unchanged.
- GitHub Flow: PR #23 (`https://github.com/coctostan/pi-watch/pull/23`) is open; no CI checks were reported at APPLY postflight.
- Unrelated `feedback.md` and `.codegraph/graph.db` remain preserved in `stash@{0}` from preflight.

---
*STATE.md — Updated after every significant action*
