# Project: pi-watch

## Description
A pi extension that lets the agent **watch videos** — answering questions about them by picking the cheapest path that works (transcript → native video model → frames-into-context), with first-class support for **local** models (no Gemini required) and room to **batch** many videos.

## Core Value
Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic, and never dependent on a single cloud provider.

## Current State
| Attribute | Value |
|-----------|-------|
| Version | 0.1.0 |
| Status | Phase 1 complete (tool-activation de-risked) |
| Last Updated | 2026-06-18 |

**Current system summary:**
- Feasibility proven (2026-06-17). Three load-bearing unknowns de-risked with runtime spikes: (1) tool-result images reach the orchestrator model; (2) local Qwen3-VL tier-2 works end-to-end; (3) **custom-tool activation works in all run modes (Phase 1)** — the prior "print-mode tool-not-found" fear was the `pi-loadout` governor stripping the tool from the active set, not a pi limitation. No production code yet — `DESIGN.md` is the build seed.

## Scope Snapshot
### Active
- v0.1: sampler data contract → sampler implementation → `watch` tool primitive → tier adapters (1/2/3) → `/watch` command.

### Planned
- Batching: `Promise.all` over tiers 1/2 first; subagent fan-out for tier-3 batch only if/when needed.

### Out of Scope
- Always-sample-every-frame approach (claude-watch style — lossy + costly).
- Subagent fan-out batching for v0.1 (deferred).
- Mandatory Gemini / cloud dependency.

## Target Users
**Primary:** The pi agent (and its users) needing to answer questions about videos without manual transcription or a mandatory cloud video API — running locally on Apple Silicon.

## Constraints
- Prefer **not** depending on Gemini; cloud is optional, never required.
- Strong preference for **local** inference; target machine is MacBook Pro M4 Pro, 48 GB unified RAM (Apple Silicon).
- All tier-2 backends speak the same OpenAI `/v1/chat/completions` shape — adapters are `baseURL` + `model id`, not code forks.

## Success Metrics
- A working `watch` tool + `/watch` command that answers video questions via the cheapest applicable tier, with a local default (Qwen3-VL via mlx_vlm.server) and no required cloud key.
- Measurable v0.1 definition of done (golden-clip correctness, asserted routes, enforced frame budget, graceful degradation) — see `PRD.md` → Success Criteria.

## Key Decisions
| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Layered artifact model (`PROJECT.md` + `PRD.md`) adopted at init | Keep hot-path context concise while preserving deeper product definition | 2026-06-18 | Active |
| WE own the sampling; model end is a thin OpenAI-compatible adapter | Native video and frame-sampling are the same mechanism underneath → local-vs-hosted becomes config, not code forks | 2026-06-18 | Active |
| Build the `watch` tool as the primitive first; command + batch wrap it | Tool is the load-bearing seam every tier plugs into | 2026-06-18 | Active |
| Qwen3-VL is the local tier-2 pick (vs Gemma ≈ frames) | Qwen3-VL has real temporal architecture (3D patch + temporal RoPE) that justifies a real local tier-2 | 2026-06-18 | Active |
| Custom-tool activation works in all modes; print-mode is NOT limited | Phase 1 spike: official example + template fail identically under a `setActiveTools` governor (`pi-loadout`); all pass with `--no-extensions` | 2026-06-18 | Active |
| Ship the real `watch` tool as an installed package and ensure it's in the active loadout | A `setActiveTools`-allowlist governor strips ad-hoc/`-e`-loaded tools from the model-facing set | 2026-06-18 | Active |

## Links
- `PRD.md` — deeper product-definition context
- `.paul/ROADMAP.md` — milestone and phase structure
- `DESIGN.md` — high-level design seed (source of truth)
- `thinkingSpace/explorations/pi-watch-ideal-design.md` — full exploration history
- `thinkingSpace/prototypes/imagecontent-spike/`, `thinkingSpace/prototypes/qwen-video-spike/` — proof code

---
*Created: 2026-06-18 10:13:09 · Last updated: 2026-06-18 after Phase 1*
