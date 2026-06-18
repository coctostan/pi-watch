# Roadmap: pi-watch

## Overview
A pi extension that lets the agent watch videos — answering questions by picking the cheapest path that works (transcript → native video model → frames-into-context), local-first and model-agnostic.

## Current Milestone
**v0.1 Initial Release** (v0.1.0)
Status: In progress
Phases: 3 of ~9 complete (~33%) — Phase 3 (Sampler implementation) ✅ done; sampler is end-to-end (pure core + effect boundary + sample() entry point). Next: Phase 4 (Router).

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Tool-activation spike | 01-01 | ✅ Complete | 2026-06-18 |
| 2 | Sampler data contract | 02-01 | ✅ Complete | 2026-06-18 |
| 3 | Sampler implementation | 03-01 ✅ + 03-02 ✅ | ✅ Complete | 2026-06-18 |
| 4 | Router | 04-01 📝 | 📝 Planning | - |
| 5 | watch tool primitive | TBD | Not started | - |
| 6 | Tier adapters | TBD | Not started | - |
| 7 | Config surface | TBD | Not started | - |
| 8 | /watch command | TBD | Not started | - |
| 9 | Batching | TBD | Not started | - |

## Phase Details

Phases will be finalized during `/paul:plan`. The proposed order below is **risk-first** (prove the un-de-risked tool-activation assumption before building for it), then follows the DESIGN.md §7 build order. See `.paul/PRD.md` → Recommended Direction / Risks / Testing Strategy for rationale.

1. **Tool-activation spike** — prove a `pi -e ext.ts`-registered `watch` tool actually runs (TUI/print mode) before building anything for it. ⚠️ only un-de-risked load-bearing assumption.
2. **Sampler data contract** — the in-memory "watched frame set" type.
3. **Sampler implementation** — ffmpeg scene-change + uniform backfill + transcript merge, with golden-clip fixtures.
4. **Router** — tier-selection + escalation policy as its own deterministically-tested unit.
5. **`watch` tool primitive** — video ref + question → sampler → router → answer.
6. **Tier adapters** — tier 1 (transcript), tier 2 (OpenAI-compat video: local Qwen / hosted Gemini), tier 3 (frames → orchestrator `ImageContent`).
7. **Config surface** — `baseURL`/`model id`, tier order, frame budget, resolution thresholds, transcript source.
8. **`/watch` command** — UX wrapper over the tool.
9. **Batching** — `Promise.all` over tiers 1/2; tier-3 subagent fan-out deferred.

**Early architectural decision (resolve in/before phase 1):** standalone vs interop with pi-web-access / s2p2-agent (already does Gemini video) — see PRD Open Questions.

---
*Roadmap created: 2026-06-18 10:13:09*
