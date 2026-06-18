# Roadmap: pi-watch

## Overview
A pi extension that lets the agent watch videos — answering questions by picking the cheapest path that works (transcript → native video model → frames-into-context), local-first and model-agnostic.

## Current Milestone
**v0.1 Initial Release** (v0.1.0)
Status: Not started
Phases: 0 of TBD complete

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | TBD | TBD | Not started | - |

## Phase Details

Phases will be defined during `/paul:plan`. The proposed build order from `DESIGN.md` §7 is a strong starting point:
1. Sampler data contract (the "watched frame set" type)
2. Sampler implementation (ffmpeg scene-change + backfill + transcript merge)
3. `watch` tool primitive (resolve print-mode tool-activation gotcha)
4. Tier adapters (1: transcript, 2: OpenAI-compat video, 3: frames → orchestrator)
5. `/watch` command
6. Batching (tiers 1/2 first; tier-3 fan-out deferred)

---
*Roadmap created: 2026-06-18 10:13:09*
