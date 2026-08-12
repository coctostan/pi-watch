# Roadmap: pi-watch

## Overview

A Pi extension that watches videos through the cheapest available path—timestamped transcript → sampled-frame vision endpoint → frames-into-context—while remaining local-first and model-agnostic.

## Current Milestone

**M5 — v0.5 — Transcript First** (target v0.5.0)
Status: 🚧 In Progress
Phases: 2 of 4 complete
Theme: Make the cheapest path cheap in practice by normalizing and selecting range-complete transcript evidence before performing expensive visual work.
Assessment: [after-v0.4 context-efficiency assessment](assessments/2026-08-11-after-v0.4-context-efficiency.md)

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 20 | Normalize and measure | 1/1 | ✅ Complete | 2026-08-12 |
| 21 | Range-aware evidence | 1/1 | ✅ Complete | 2026-08-12 |
| 22 | Route before decoding | TBD | 🔵 Ready to plan | — |
| 23 | Harden and prove | TBD | Not started | — |

### Phase 20: Normalize and measure
Focus: Establish deterministic context-efficiency baselines and conservatively remove rolling-caption overlap while preserving timing and legitimate repetition.
Plans: 1/1 complete — [20-01: Conservative rolling-caption normalization and context baseline](phases/20-normalize-and-measure/20-01-PLAN.md) (complete 2026-08-12)
Serves: R3, R6

### Phase 21: Range-aware evidence
Focus: Honor supported YouTube timestamps and explicit `start` / `end` ranges across transcript, eligible ASR, and visual fallback, with bounded coverage and truncation metadata.
Plans: 1/1 complete — [21-01: Range-aware transcript and visual evidence](phases/21-range-aware-evidence/21-01-PLAN.md) (complete 2026-08-12)
Serves: R2, R3, R5, R6

### Phase 22: Route before decoding
Focus: Stage transcript acquisition so successful tier-1 calls avoid scene detection and frame decoding, with an explicit broad spoken/visual/mixed question policy and unchanged cleanup/fallback guarantees.
Plans: TBD (defined during `/paul:plan`)

### Phase 23: Harden and prove
Focus: Close R8, R18, R22, and R4/R6; prove compiled-package context efficiency; and publish operator guidance without broadening into unrelated maintenance.
Plans: TBD (defined during `/paul:plan`)

### Milestone boundaries
- No new dependency, mandatory model, cloud service, persistent transcript handle/cache, or model-backed synthesis.
- Preserve the `watch` primitive, thin model adapters, captions-first ASR, narrow source ownership, privacy-safe diagnostics, and tier 3 as the universal fallback.
- Measure baseline-to-result context/work reductions; do not adopt the feedback's estimated 70–90% reduction as a release promise.
- Keep R8 limited to quoted local references containing spaces rather than a general shell parser.
## Completed Milestones

| Milestone | Completed | Phases | Summary | Archive |
|-----------|-----------|--------|---------|---------|
| v0.1 — Initial Release | 2026-06-22 | 1–9 | Tool activation, sampler, router, watch tool, tier adapters, config, command, and batching. | — (completed before roadmap archives) |
| v0.2 — Tier 2, For Real | 2026-07-10 | 10–13 | Local Qwen3-VL endpoint, production live proof, structured tier-2 diagnostics, and first-run config UX. | [archive](archive/roadmap/v0.2.0-tier-2-for-real.md) |
| v0.3 — Paste and Watch | 2026-08-09 | 14–16 | YouTube resolution, caption-backed tier 1, end-to-end URL proof, and distributable Git/local installation UX. | [archive](archive/roadmap/v0.3.0-paste-and-watch.md) |
| M4 — v0.4 — Listen Locally | 2026-08-11 | 17–19 | Bounded captions-first local ASR, private diagnostics, visual fallback, compiled-package proof, and operator setup UX. | [archive](archive/roadmap/v0.4.0-listen-locally.md) |

## Carried Forward

### Audit-routed follow-up outside M5
- R3 — Make question-derived OCR resolution effective before frame decoding.

### Deferred product and maintenance work
- Dedicated CI workflow beyond Socket-only PR checks.
- Tier-3 batch fan-out when frames-for-many-videos becomes necessary.
- Focused, test-backed decomposition of measured hotspots beyond Phase 20's caption-core extraction: `src/sampler/effects.ts` (642 lines), `src/watch/tier-runner.ts` (642), and `src/watch/extension.ts` (493). *(Amended by Phase 21 plan 21-01; provenance: `.paul/phases/21-range-aware-evidence/21-01-SUMMARY.md`.)*
- Optional resolver-wide download filesize/duration caps if runtime evidence warrants them.
- Advanced ASR capabilities: speaker diarization, translation, subtitle export, streaming/live video, multilingual guarantees, long-media chunking, and service adapters.
- Richer command/config surfaces and optional TypeBox peer-dependency cleanup.
- Optional Gemini/cloud tier remains non-mandatory.
- Scoped npm package rename/publication; until then, use Git/local Pi sources because `npm:pi-watch` is unrelated.
- Dependency maintenance for the unchanged dev tree (currently 0 critical / 4 high / 2 moderate).

---
*Roadmap created: 2026-06-18 10:13:09 · Last updated: 2026-08-12 after Phase 21 UNIFY*
