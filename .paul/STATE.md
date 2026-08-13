# Project State

## Project Reference

See: `.paul/PROJECT.md` (v0.5.0 released baseline; awaiting next milestone definition)

**Core value:** Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic.
**Current focus:** None active — M5 / v0.5 Transcript First is released. Next milestone scope is undefined.

## Current Position

Milestone: Awaiting next milestone
Version: v0.5.0 (released)
Phase: None active
Plan: None
Status: Milestone M5 — v0.5 — Transcript First complete — ready for next
Last activity: 2026-08-13 — Completed M5: passing R1–R22 adherence audit (21 HELD / 1 DRIFTED resolved / 0 OBSOLETE, 6 findings routed), milestone entry and roadmap archive written, tagged v0.5.0.
Next action: `/paul:discuss-milestone` or `/paul:milestone`

Progress:
- Milestone M5 / v0.5: [██████████] 100% ✓ (Phases 20–23, 4 plans, released v0.5.0)
- Milestone M4 / v0.4: [██████████] 100% ✓ (Phases 17–19, 3 plans, released v0.4.0)
- Milestone v0.3: [██████████] 100% ✓ (Phases 14–16, 3 plans)
- Milestone v0.2: [██████████] 100% ✓ (Phases 10–13)
- Milestone v0.1: [██████████] 100% ✓ (Phases 1–9)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Milestone complete — ready for next]
```

## Accumulated Context

### Validated Product Decisions

- We own sampling; model backends remain thin, swappable OpenAI-compatible adapters (`baseURL` + model id).
- Choose the cheapest tier that answers the question: transcript first, OpenAI-compatible sampled-frame vision second, frames-into-context as the universal fallback; raw native-video ingestion remains deferred.
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
- Broad, spoken, and mixed prompts may start at tier 1 with non-empty in-range transcript evidence; explicitly visual/temporal and on-screen-text prompts stay visual, broad-only prompts remain ASR-ineligible, and one staged decision is reused after sampling.
- The v0.5 compiled-registration corpus proves 301→235 transcript bytes; three tier-1 results use 1,374 / 1,394 / 1,077 serialized bytes with zero scene/decode calls, versus a same-corpus 7,144-byte visual control with one scene call and two decodes. Claims remain corpus-scoped.
- `/watch` accepts exactly one leading matching quoted local ref with interior spaces preserved; interior content is delegated verbatim and never interpreted, while malformed input is rejected with the usage string. Effective ASR duration/timeout are clamped to compiled ceilings at the exported adapter boundary before any comparison or spawn.

### Deferred Issues

- Tier-3 batch fan-out for frames across many videos.
- Optional Gemini/cloud tier.
- Advanced ASR features: diarization, translation, subtitle export, streaming/live video, multilingual guarantees, long-media chunking, and service adapters.
- Optional resolver download filesize/duration caps beyond v0.4's ASR-specific policy if runtime evidence warrants them.
- Focused decomposition of measured hotspots beyond Phase 20's caption-core extraction: `src/sampler/effects.ts` (642 lines), `src/watch/tier-runner.ts` (642), and `src/watch/extension.ts` (499).
- Dedicated CI workflow beyond Socket Security checks.
- Scoped npm package rename/publication; Git/local sources remain the supported distribution path.
- M5 audit follow-ups: pin the exact-duplicate-over-budget caption case and correct its wording without reordering the checks (F2, chain R3); add R#-tagged acceptance surfaces for the 15 untagged requirements (F5); separate historical v0.1 success criteria from the current R16–R22 inventory (F6).

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

Last session: 2026-08-13 — Completed milestone M5 — v0.5 — Transcript First.
Stopped at: Milestone M5 complete and released as `v0.5.0`.
Next action: `/paul:discuss-milestone` or `/paul:milestone`
Resume file: `.paul/MILESTONES.md`
wip_result: not requested — milestone complete
Git state: `main` carries the squashed Phase 23 merge `36a03fb` plus milestone closure commits and the annotated `v0.5.0` tag; all phase branches are merged and pruned; `.codegraph/` remains untracked and out of scope.
Resume context:
- M5 shipped 4 phases / 4 plans with a final suite of 362 passed / 3 default-skipped, passing typecheck, and byte-identical committed `dist/**`.
- Exact compiled corpus metrics are 301 raw / 235 normalized transcript bytes; transcript results are 1,374 / 1,394 / 1,077 bytes with zero `ffmpeg` work, and visual control is 7,144 bytes with 1 scene + 2 decode calls.
- The M5 adherence audit (`.paul/audits/M5-AUDIT.md`) returned 21 HELD / 1 DRIFTED (resolved) / 0 OBSOLETE with all 6 findings routed and R1–R22 explicitly re-affirmed.
- DEAN remains 0 critical / 4 high / 2 moderate / 0 low; no dependency change. Advisory hotspot remains `tier-runner.ts` at 642 lines; broader decomposition is deferred.

---
*STATE.md — Updated after every significant action*
