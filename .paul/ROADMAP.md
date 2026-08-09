# Roadmap: pi-watch

## Overview
A pi extension that lets the agent watch videos — answering questions by picking the cheapest path that works (transcript → native video model → frames-into-context), local-first and model-agnostic.

## Current Milestone
**v0.3 — Paste and Watch** (v0.3.0)
Status: ✅ Complete — ready for milestone completion/release routing
Phases: 3 of 3 complete (100%)
Focus: v0.3 product scope is complete: YouTube source resolution, caption-backed tier 1, registered tool/command URL UX, opt-in live proof, Git/local installation, and troubleshooting documentation.

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 14 | YouTube source resolution | 1/1 | ✅ Complete | 2026-07-10 |
| 15 | Caption transcript pipeline | 1/1 | ✅ Complete | 2026-07-22 |
| 16 | End-to-end URL UX | 1/1 | ✅ Complete | 2026-08-09 |

## Phase Details (v0.3 — complete)

### Phase 14: YouTube source resolution
Focus: Detect and normalize YouTube URLs; resolve/download media through `yt-dlp`; preserve local refs; enforce argv-only process execution, timeouts, explicit temporary-file ownership/cleanup, and legible resolver errors.
Plans: 1/1 complete — [14-01 PLAN](phases/14-youtube-source-resolution/14-01-PLAN.md) · [SUMMARY](phases/14-youtube-source-resolution/14-01-SUMMARY.md)

### Phase 15: Caption transcript pipeline
Focus: Fetch human or auto-generated captions, parse timestamped segments into the existing transcript timeline, make tier 1 reachable for spoken-content questions, and preserve visual fallback when captions are unavailable.
Plans: 1/1 complete — [15-01 PLAN](phases/15-caption-transcript-pipeline/15-01-PLAN.md) · [SUMMARY](phases/15-caption-transcript-pipeline/15-01-SUMMARY.md) · [PR #17](https://github.com/coctostan/pi-watch/pull/17)

### Phase 16: End-to-end URL UX
Focus: Prove pasted YouTube URLs through the actual `watch` tool and `/watch` command, make clean Pi Git installation build the manifest-referenced extension, add deterministic offline coverage plus an opt-in live YouTube smoke, and document prerequisites, supported scope, cleanup, fallback behavior, and troubleshooting.
Plans: 1/1 complete — [16-01 PLAN](phases/16-end-to-end-url-ux/16-01-PLAN.md) · [SUMMARY](phases/16-end-to-end-url-ux/16-01-SUMMARY.md) · implementation [PR #18](https://github.com/coctostan/pi-watch/pull/18) · lifecycle [PR #19](https://github.com/coctostan/pi-watch/pull/19)

## Completed Milestones

| Milestone | Completed | Phases | Summary | Archive |
|-----------|-----------|--------|---------|---------|
| v0.1 — Initial Release | 2026-06-22 | 1–9 | Tool activation, sampler, router, watch tool, tier adapters, config, command, and batching. | — (completed before roadmap archives) |
| v0.2 — Tier 2, For Real | 2026-07-10 | 10–13 | Local Qwen3-VL endpoint, production live proof, structured tier-2 diagnostics, and first-run config UX. | [archive](archive/roadmap/v0.2.0-tier-2-for-real.md) |

## v0.3 Constraints

- Advertise/test YouTube-first support behind a generic resolver seam.
- `yt-dlp` is an external runtime prerequisite, not an npm dependency.
- Captions first; Whisper/local ASR remains deferred.
- No mandatory cloud service or provider key.
- Caption absence degrades to existing visual tiers; failures stay legible and never fabricate spoken content.
- Local-file behavior and existing tier-2/tier-3 contracts remain stable.
- Caller-controlled refs use argv-only execution, bounded timeouts, and explicit cleanup.
- Default tests remain offline and deterministic; real YouTube proof is opt-in.
- Installation uses Git/local Pi package sources; `npm:pi-watch` is unrelated, npm rename/publication remains deferred, and exact committed `dist/**` output keeps Pi Git installation loadable when dev build tooling is omitted.
- Phase 16 requires one observed passing opt-in live YouTube smoke; unavailable prerequisites/network block completion rather than create a validation exception.

## Carried Forward

- Dedicated CI workflow beyond Socket-only PR checks.
- Tier-3 batch fan-out when frames-for-many-videos becomes necessary.
- Richer command/config surfaces and optional TypeBox peer-dependency cleanup.
- Optional Gemini/cloud tier remains non-mandatory.

---
*Roadmap created: 2026-06-18 10:13:09 · v0.1 completed: 2026-06-22 · v0.2 completed: 2026-07-10 · v0.3 created: 2026-07-10 · Phase 14 completed: 2026-07-10 · Phase 15 completed: 2026-07-22 · Phase 16 completed: 2026-08-09 · v0.3 phase scope completed: 2026-08-09*
