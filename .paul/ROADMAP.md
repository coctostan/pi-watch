# Roadmap: pi-watch

## Overview

A Pi extension that watches videos through the cheapest available path—timestamped transcript → sampled-frame vision endpoint → frames-into-context—while remaining local-first and model-agnostic.

## Current Milestone

**M4 — v0.4 — Listen Locally** (v0.4.0)
Status: ✅ Complete
Completed: 2026-08-11
Phases: 17–19 (3 plans)
Outcome: Captionless English speech can reach transcript-first routing through explicitly enabled bounded local ASR, with typed private diagnostics, visual fallback, deterministic compiled-package proof, and complete operator guidance.
Archive: [archive/roadmap/v0.4.0-listen-locally.md](archive/roadmap/v0.4.0-listen-locally.md)
Audit: [audits/M4-AUDIT.md](audits/M4-AUDIT.md)

## Next Milestone

Run `/paul:discuss-milestone` or `/paul:milestone` to define the next milestone.

## Completed Milestones

| Milestone | Completed | Phases | Summary | Archive |
|-----------|-----------|--------|---------|---------|
| v0.1 — Initial Release | 2026-06-22 | 1–9 | Tool activation, sampler, router, watch tool, tier adapters, config, command, and batching. | — (completed before roadmap archives) |
| v0.2 — Tier 2, For Real | 2026-07-10 | 10–13 | Local Qwen3-VL endpoint, production live proof, structured tier-2 diagnostics, and first-run config UX. | [archive](archive/roadmap/v0.2.0-tier-2-for-real.md) |
| v0.3 — Paste and Watch | 2026-08-09 | 14–16 | YouTube resolution, caption-backed tier 1, end-to-end URL proof, and distributable Git/local installation UX. | [archive](archive/roadmap/v0.3.0-paste-and-watch.md) |
| M4 — v0.4 — Listen Locally | 2026-08-11 | 17–19 | Bounded captions-first local ASR, private diagnostics, visual fallback, compiled-package proof, and operator setup UX. | [archive](archive/roadmap/v0.4.0-listen-locally.md) |

## Carried Forward

### Audit-routed follow-up
- R3 — Make question-derived OCR resolution effective before frame decoding.
- R3 — Acquire sufficient transcript evidence before scene detection/frame decoding so tier-1 success avoids frame extraction.
- R8 — Support quoted `/watch` local paths containing spaces.
- R18 — Enforce absolute ASR duration/timeout ceilings inside the exported adapter boundary.
- R22 — Make nested package proof use a test-owned npm cache.
- R4/R6 — Reconcile router rationale and sampled-frame/native-video terminology without changing runtime policy.

### Deferred product and maintenance work
- Dedicated CI workflow beyond Socket-only PR checks.
- Tier-3 batch fan-out when frames-for-many-videos becomes necessary.
- Focused, test-backed decomposition of `src/sampler/effects.ts` beyond extraction directly required by v0.4.
- Optional resolver-wide download filesize/duration caps if runtime evidence warrants them.
- Advanced ASR capabilities: speaker diarization, translation, subtitle export, streaming/live video, multilingual guarantees, long-media chunking, and service adapters.
- Richer command/config surfaces and optional TypeBox peer-dependency cleanup.
- Optional Gemini/cloud tier remains non-mandatory.
- Scoped npm package rename/publication; until then, use Git/local Pi sources because `npm:pi-watch` is unrelated.
- Dependency maintenance for the unchanged dev tree (currently 0 critical / 4 high / 2 moderate).

---
*Roadmap created: 2026-06-18 10:13:09 · M4/v0.4 milestone completed: 2026-08-11*
