# Roadmap: pi-watch

## Overview
A pi extension that lets the agent watch videos — answering questions by picking the cheapest path that works (transcript → native video model → frames-into-context), local-first and model-agnostic.

## Current Milestone
**v0.2 — Tier 2, For Real** (v0.2.0)
Status: 🚧 In Progress
Phases: 2 of 4 complete (50%)
Focus: Stand up the local Qwen3-VL server, prove the tier-2 wire shape against it live, and make tier-2 failures visible — so `/watch` answers from the real model and degrades legibly.

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 10 | Stand up the model | 10-01 ✅ | ✅ Complete | 2026-06-24 |
| 11 | Tier-2 live wire-shape proof | 11-01 ✅ | ✅ Complete | 2026-06-24 |
| 12 | Tier-2 failure diagnostics | 12-01 ✅ | 🔄 Merge gate (PR #14) | - |
| 13 | Tier-2 config UX | TBD | Not started | - |

## Completed Milestones

### v0.1 Initial Release (v0.1.0) — Complete 2026-06-22
9 of 9 phases (100%): tool activation proven, sampler contract/implementation, router, watch tool, tier adapters, config surface, `/watch` command, and batching.

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Tool-activation spike | 01-01 | ✅ Complete | 2026-06-18 |
| 2 | Sampler data contract | 02-01 | ✅ Complete | 2026-06-18 |
| 3 | Sampler implementation | 03-01 ✅ + 03-02 ✅ | ✅ Complete | 2026-06-18 |
| 4 | Router | 04-01 ✅ | ✅ Complete | 2026-06-18 |
| 5 | watch tool primitive | 05-01 ✅ | ✅ Complete | 2026-06-19 |
| 6 | Tier adapters | 06-01 ✅ + 06-02 ✅ | ✅ Complete | 2026-06-19 |
| 7 | Config surface | 07-01 ✅ | ✅ Complete | 2026-06-19 |
| 8 | /watch command | 08-01 ✅ | ✅ Complete | 2026-06-20 |
| 9 | Batching | 09-01 ✅ | ✅ Complete | 2026-06-22 |

## Phase Details (v0.2 — current)

Phases will be finalized during `/paul:plan`. v0.2 makes the local native-video tier (Qwen3-VL via `mlx_vlm.server`) actually answer through `/watch`, and fail legibly. See `.paul/MILESTONES.md` (if present) and the strategic assessment `.paul/assessments/2026-06-22-after-v0.1.md` for rationale.

10. **Stand up the model** — ✅ Complete 2026-06-24. Local `mlx_vlm.server` is running with `mlx-community/Qwen3-VL-8B-Instruct-4bit`; `docs/TIER2-SETUP.md` records uv-pinned setup, server command, smoke test, and WATCH_TIER2_* exports.
11. **Tier-2 live wire-shape proof** — ✅ Complete 2026-06-24. Added an opt-in, default-skipped Vitest proof that sends `buildTier2Request` output to local `mlx_vlm.server` and confirms `parseTier2Answer` reads a real answer; no production adapter mismatch or per-model branch was needed.
12. **Tier-2 failure diagnostics** — UNIFY complete 2026-06-24 (PR #14 merge gate pending). Replaced the silent `catch { return null }` / `!res.ok → null` with a structured `Tier2Diagnostic` (unconfigured / http-error+status / empty-answer / timeout / network-error) surfaced as `details.tier2` on `watch` + `watch_batch`, via an option-a onDiagnostic boundary collector that left the null→tier-3 escalation contract and `tier-runner.ts` byte-for-byte unchanged.
13. **Tier-2 config UX** — a sensible local default (auto-point at localhost `mlx_vlm`) and/or a "tier 2 unconfigured — set X to enable it" message; may fold into Phase 12.

## Phase Details (v0.1 — completed)

The proposed order below was **risk-first** (prove the un-de-risked tool-activation assumption before building for it), then followed the DESIGN.md §7 build order. See `.paul/PRD.md` → Recommended Direction / Risks / Testing Strategy for rationale.

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
*Roadmap created: 2026-06-18 10:13:09 · v0.1 completed: 2026-06-22 · v0.2 created: 2026-06-22 · Phase 10 completed: 2026-06-24 · Phase 11 completed: 2026-06-24*
