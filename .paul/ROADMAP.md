# Roadmap: pi-watch

## Overview
A pi extension that lets the agent watch videos — answering questions by picking the cheapest path that works (transcript → native video model → frames-into-context), local-first and model-agnostic.

## Current Milestone
**v0.2 — Tier 2, For Real** (v0.2.0)
Status: ✅ Complete
Completed: 2026-07-10
Archive: [archive/roadmap/v0.2.0-tier-2-for-real.md](archive/roadmap/v0.2.0-tier-2-for-real.md)

## Next Milestone
Run `/paul:discuss-milestone` to define the next milestone's vision and scope.

## Completed Milestones

| Milestone | Completed | Phases | Summary | Archive |
|-----------|-----------|--------|---------|---------|
| v0.1 — Initial Release | 2026-06-22 | 1–9 | Tool activation, sampler, router, watch tool, tier adapters, config, command, and batching. | — (completed before roadmap archives) |
| v0.2 — Tier 2, For Real | 2026-07-10 | 10–13 | Local Qwen3-VL endpoint, production live proof, structured tier-2 diagnostics, and first-run config UX. | [archive](archive/roadmap/v0.2.0-tier-2-for-real.md) |

## Carried Forward

- Dedicated CI workflow beyond Socket-only PR checks.
- Live pi runtime smoke for `watch` and `watch_batch`.
- Tier-3 batch fan-out when frames-for-many-videos becomes necessary.
- Richer command/config surfaces and optional TypeBox peer-dependency cleanup.
- Optional Gemini/cloud tier remains non-mandatory.

---
*Roadmap created: 2026-06-18 10:13:09 · v0.1 completed: 2026-06-22 · v0.2 completed and archived: 2026-07-10*
