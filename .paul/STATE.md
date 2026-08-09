# Project State

## Project Reference

See: `.paul/PROJECT.md` (v0.3 shipped baseline)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** v0.3 — Paste and Watch is complete; awaiting definition of the next milestone.

## Current Position

Milestone: Awaiting next milestone
Version: v0.3.0
Phase: None active
Plan: None
Status: Milestone v0.3 — Paste and Watch complete; Standard Fix 02 verified on `fix/pi-spec-compliance`, GitHub Flow completion pending
Last activity: 2026-08-09 — Standard Fix 02 implemented and verified: Pi package/tool spec compliance, aggregate output bounds, and production package proof.
Next action: Review Fix 02 changes, then commit, push, and open the GitHub Flow PR.

Progress:
- Milestone v0.3: [██████████] 100% ✓ (Phases 14–16, 3 plans)
- Milestone v0.2: [██████████] 100% ✓ (Phases 10–13)
- Milestone v0.1: [██████████] 100% ✓ (Phases 1–9)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Milestone complete — awaiting next]
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

### Deferred Issues

- Tier-3 batch fan-out for frames across many videos.
- Optional Gemini/cloud tier.
- Whisper/local ASR for videos without captions.
- Optional resolver download filesize/duration caps if runtime evidence warrants them.
- Focused, test-backed decomposition of `src/sampler/effects.ts`.
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

Last session: 2026-08-09 — Standard Fix 02 implemented and fully verified on `fix/pi-spec-compliance`.
Stopped at: Source/tests/generated `dist/**` and PALS fix artifacts are ready; no commit, push, or PR was created because `auto_commit` is disabled.
Next action: Review Fix 02 changes, then commit, push, and open the GitHub Flow PR.
wip_result: feature-branch
Resume file: `.paul/fixes/02-FIX-SUMMARY.md`
Resume context:
- Full gates pass: 210 tests passed with 2 default-skipped, typecheck/build/diff checks pass, and audit is unchanged at 0 critical / 4 high / 2 moderate.
- Production-style npm pack/install and direct local-package Pi runs both loaded `watch` and answered the reported YouTube URL.
- Final adversarial review found no material issues after UTF-8, final-composition, required-hint, and frame-pair boundary hardening.
- The consumed installation handoff was archived at `.paul/handoffs/archive/HANDOFF-2026-08-09-fix01-merged-install-pending.md`.
- Next-milestone discovery remains paused; normal loop position is unchanged.

---
*STATE.md — Updated after every significant action*
