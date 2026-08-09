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
Status: Milestone v0.3 — Paste and Watch complete — ready for next milestone discovery
Last activity: 2026-08-09 — Standard Fix 01 completed: long-form scene analysis is bounded and recovers to uniform sampling.
Next action: Run `/skill:paul-discuss` to explore and define the next milestone.

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

## Session Continuity

Last session: 2026-08-09 — Standard Fix 01 completed after the reported long-form YouTube timeout.
Stopped at: Fix verified; normal milestone discussion can resume.
Next action: Resume `/skill:paul-discuss` from the accepted strategic assessment and choose next-milestone features.
wip_result: not applicable — standard fix loop is complete.
Resume file: `.paul/fixes/01-FIX-SUMMARY.md`
Resume context:
- The reported 19m20s URL previously failed twice at the 60-second scene-scan timeout; the production registered tool now succeeds in 7.959s with one uniform frame and a duration-skip diagnostic.
- Full gates: 201 passed, 2 default-skipped; typecheck/build pass; generated `dist/**` is reproducible; audit unchanged at 0 critical / 4 high / 2 moderate.
- Next-milestone strategic assessment was accepted before the fix and remains at `.paul/assessments/2026-08-09-after-v0.3.md`; feature exploration is still open.
- Transcript-first reordering and resolver format selection remain outside Fix 01.

---
*STATE.md — Updated after every significant action*
