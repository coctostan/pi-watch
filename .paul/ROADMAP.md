# Roadmap: pi-watch

## Overview

A pi extension that lets the agent watch videos — answering questions by picking the cheapest path that works (transcript → native video model → frames-into-context), local-first and model-agnostic.

## Current Milestone

**v0.4 — Listen Locally** (v0.4.0)
Status: ✅ Complete — ready for milestone reconciliation/release
Phases: 3 of 3 complete
Goal: Make transcript-first routing work for English speech when captions are unavailable, using bounded, explicitly enabled local ASR while preserving every existing fallback.

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 17 | Bounded ASR foundation | 1/1 | ✅ Complete | 2026-08-09 |
| 18 | Local transcript fallback | 1/1 | ✅ Complete | 2026-08-10 |
| 19 | Local speech UX and proof | 1/1 | ✅ Complete | 2026-08-10 |

## Phase Details

### Phase 17: Bounded ASR foundation

Focus: Establish the ASR seam, configuration, speech-intent gating, diagnostics, ownership, and resource policies.
Plans: 1/1 complete (`17-01` — bounded `mlx-whisper` runtime research and implementation-boundary decision; [summary](phases/17-bounded-asr-foundation/17-01-SUMMARY.md))

### Phase 18: Local transcript fallback

Focus: Add captions-first → ASR-second timestamped transcript acquisition for local files and captionless supported YouTube videos, with visual fallback on every failure.
Plans: 1/1 complete (`18-01` — bounded captions-first local ASR fallback; [summary](phases/18-local-transcript-fallback/18-01-SUMMARY.md))

### Phase 19: Local speech UX and proof

Focus: Ship opt-in setup and diagnostics, deterministic English fixtures, an optional bounded live proof, and end-to-end registered-tool validation.
Plans: 1/1 complete (`19-01` — local speech operability and installed proof; [summary](phases/19-local-speech-ux-and-proof/19-01-SUMMARY.md))

## Completed Milestones

| Milestone | Completed | Phases | Summary | Archive |
|-----------|-----------|--------|---------|---------|
| v0.1 — Initial Release | 2026-06-22 | 1–9 | Tool activation, sampler, router, watch tool, tier adapters, config, command, and batching. | — (completed before roadmap archives) |
| v0.2 — Tier 2, For Real | 2026-07-10 | 10–13 | Local Qwen3-VL endpoint, production live proof, structured tier-2 diagnostics, and first-run config UX. | [archive](archive/roadmap/v0.2.0-tier-2-for-real.md) |
| v0.3 — Paste and Watch | 2026-08-09 | 14–16 | YouTube resolution, caption-backed tier 1, end-to-end URL proof, and distributable Git/local installation UX. | [archive](archive/roadmap/v0.3.0-paste-and-watch.md) |

## Carried Forward

- Dedicated CI workflow beyond Socket-only PR checks.
- Tier-3 batch fan-out when frames-for-many-videos becomes necessary.
- Focused, test-backed decomposition of `src/sampler/effects.ts` beyond extraction directly required by v0.4.
- Optional resolver download filesize/duration caps beyond the ASR-specific duration policy if runtime evidence warrants them.
- Advanced ASR capabilities: speaker diarization, translation, subtitle export, streaming/live video, multilingual guarantees, long-media chunking, and service adapters.
- Richer command/config surfaces and optional TypeBox peer-dependency cleanup.
- Optional Gemini/cloud tier remains non-mandatory.
- Scoped npm package rename/publication; until then, use Git/local Pi sources because `npm:pi-watch` is unrelated.
- Dependency maintenance for the unchanged dev tree (currently 0 critical / 4 high / 2 moderate).

---
*Roadmap created: 2026-06-18 10:13:09 · v0.1 completed: 2026-06-22 · v0.2 completed: 2026-07-10 · v0.3 completed: 2026-08-09 · v0.4 created: 2026-08-09 · v0.4 phases completed: 2026-08-10*
