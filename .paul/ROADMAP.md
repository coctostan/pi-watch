# Roadmap: pi-watch

## Overview

A Pi extension that watches videos through the cheapest available path—timestamped transcript → sampled-frame vision endpoint → frames-into-context—while remaining local-first and model-agnostic.

## Current Milestone

**M5 — v0.5 — Transcript First** (released v0.5.0)
Status: ✅ Complete
Completed: 2026-08-13
Archive: [archive/roadmap/v0.5.0-transcript-first.md](archive/roadmap/v0.5.0-transcript-first.md)
Adherence audit: [audits/M5-AUDIT.md](audits/M5-AUDIT.md)

## Next Milestone

Run `/paul:discuss-milestone` or `/paul:milestone` to define.

### Carried into next-milestone candidate scope
- F2 (chain R3) — pin the exact-duplicate-over-budget caption case with a test and correct the overstated "over-budget cues remain unchanged" wording. **Do not reorder the equality and budget checks.**
- F5 — 15 stable requirements (R1, R2, R7, R9–R17, R19–R21) still have no R#-tagged acceptance surface.
- F6 - the PRD blends historical v0.1 success criteria with the current R16-R22 inventory.
## Completed Milestones

| Milestone | Completed | Phases | Summary | Archive |
|-----------|-----------|--------|---------|---------|
| v0.1 — Initial Release | 2026-06-22 | 1–9 | Tool activation, sampler, router, watch tool, tier adapters, config, command, and batching. | — (completed before roadmap archives) |
| v0.2 — Tier 2, For Real | 2026-07-10 | 10–13 | Local Qwen3-VL endpoint, production live proof, structured tier-2 diagnostics, and first-run config UX. | [archive](archive/roadmap/v0.2.0-tier-2-for-real.md) |
| v0.3 — Paste and Watch | 2026-08-09 | 14–16 | YouTube resolution, caption-backed tier 1, end-to-end URL proof, and distributable Git/local installation UX. | [archive](archive/roadmap/v0.3.0-paste-and-watch.md) |
| M4 — v0.4 — Listen Locally | 2026-08-11 | 17–19 | Bounded captions-first local ASR, private diagnostics, visual fallback, compiled-package proof, and operator setup UX. | [archive](archive/roadmap/v0.4.0-listen-locally.md) |
| M5 — v0.5 — Transcript First | 2026-08-13 | 20–23 | Caption normalization, one absolute range with available-versus-returned coverage, transcript-first routing before decoding, and a compiled corpus-scoped efficiency proof. | [archive](archive/roadmap/v0.5.0-transcript-first.md) |

## Carried Forward

### Deferred product and maintenance work
- Dedicated CI workflow beyond Socket-only PR checks.
- Tier-3 batch fan-out when frames-for-many-videos becomes necessary.
- Focused, test-backed decomposition of measured hotspots beyond Phase 20's caption-core extraction: `src/sampler/effects.ts` (642 lines), `src/watch/tier-runner.ts` (642), and `src/watch/extension.ts` (499). *(Amended by Phase 21 plan 21-01; current measurement from Phase 22 plan 22-01; provenance: `.paul/phases/22-route-before-decoding/22-01-SUMMARY.md`.)*
- Optional resolver-wide download filesize/duration caps if runtime evidence warrants them.
- Advanced ASR capabilities: speaker diarization, translation, subtitle export, streaming/live video, multilingual guarantees, long-media chunking, and service adapters.
- Richer command/config surfaces and optional TypeBox peer-dependency cleanup.
- Optional Gemini/cloud tier remains non-mandatory.
- Scoped npm package rename/publication; until then, use Git/local Pi sources because `npm:pi-watch` is unrelated.
- Dependency maintenance for the unchanged dev tree (currently 0 critical / 4 high / 2 moderate).

---
*Roadmap created: 2026-06-18 10:13:09 · Last updated: 2026-08-13 after M5 milestone completion*
