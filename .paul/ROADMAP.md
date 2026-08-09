# Roadmap: pi-watch

## Overview

A pi extension that lets the agent watch videos — answering questions by picking the cheapest path that works (transcript → native video model → frames-into-context), local-first and model-agnostic.

## Current Milestone

**v0.3 — Paste and Watch** (v0.3.0)
Status: ✅ Complete
Completed: 2026-08-09
Outcome: Supported YouTube URLs resolve into owned local media, use bounded captions for transcript-first answers when available, preserve visual fallback, and work through the registered tool/command with verified Git/local installation UX.
Archive: [archive/roadmap/v0.3.0-paste-and-watch.md](archive/roadmap/v0.3.0-paste-and-watch.md)

## Next Milestone

Run `/skill:paul-discuss` to explore the next milestone, or `/skill:paul-milestone` to create one directly.

## Completed Milestones

| Milestone | Completed | Phases | Summary | Archive |
|-----------|-----------|--------|---------|---------|
| v0.1 — Initial Release | 2026-06-22 | 1–9 | Tool activation, sampler, router, watch tool, tier adapters, config, command, and batching. | — (completed before roadmap archives) |
| v0.2 — Tier 2, For Real | 2026-07-10 | 10–13 | Local Qwen3-VL endpoint, production live proof, structured tier-2 diagnostics, and first-run config UX. | [archive](archive/roadmap/v0.2.0-tier-2-for-real.md) |
| v0.3 — Paste and Watch | 2026-08-09 | 14–16 | YouTube resolution, caption-backed tier 1, end-to-end URL proof, and distributable Git/local installation UX. | [archive](archive/roadmap/v0.3.0-paste-and-watch.md) |

## Carried Forward

- Dedicated CI workflow beyond Socket-only PR checks.
- Tier-3 batch fan-out when frames-for-many-videos becomes necessary.
- Focused, test-backed decomposition of `src/sampler/effects.ts`.
- Optional resolver download filesize/duration caps if runtime evidence warrants them.
- Whisper/local ASR for videos without captions.
- Richer command/config surfaces and optional TypeBox peer-dependency cleanup.
- Optional Gemini/cloud tier remains non-mandatory.
- Scoped npm package rename/publication; until then, use Git/local Pi sources because `npm:pi-watch` is unrelated.
- Dependency maintenance for the unchanged dev tree (currently 0 critical / 4 high / 2 moderate).

---
*Roadmap created: 2026-06-18 10:13:09 · v0.1 completed: 2026-06-22 · v0.2 completed: 2026-07-10 · v0.3 completed and archived: 2026-08-09*
