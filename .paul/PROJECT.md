# Project: pi-watch

## Description
A pi extension that lets the agent **watch videos** — answering questions about them by picking the cheapest path that works (transcript → native video model → frames-into-context), with first-class support for **local** models (no Gemini required) and room to **batch** many videos.

## Core Value
Cheapest-path-that-works video understanding for the agent — local-first, model-agnostic, and never dependent on a single cloud provider.

## Current State
| Attribute | Value |
|-----------|-------|
| Version | 0.2.0 in progress |
| Status | v0.2 in progress — Phase 10 complete: local Qwen3-VL tier-2 endpoint stood up, smoke-tested through the OpenAI-compatible image_url chat-completions shape, and documented in `docs/TIER2-SETUP.md`. Next: Phase 11 live wire-shape proof through the actual watch pipeline. |
| Last Updated | 2026-06-24 |

**Current system summary:**
- Feasibility proven (2026-06-17). Three load-bearing unknowns de-risked with runtime spikes: (1) tool-result images reach the orchestrator model; (2) local Qwen3-VL tier-2 works end-to-end; (3) **custom-tool activation works in all run modes (Phase 1)** — the prior "print-mode tool-not-found" fear was the `pi-loadout` governor stripping the tool from the active set, not a pi limitation.
- **Phase 2 (2026-06-18):** First production code shipped — the tier-neutral `WatchedFrameSet` data contract (TypeBox schemas + pure invariant validator) and a pure `toOpenAIContent()` serializer to the proven OpenAI `content[]` wire shape, on a Vitest + TypeBox toolchain. This is the seam every tier plugs into. `DESIGN.md` remains the build seed.
- **Phase 3 (2026-06-18):** The sampler is implemented end-to-end. 03-01 shipped the pure decision/assembly core (`selectFrameTimes` scene-cut + gap-gated backfill + budget cap; `assembleWatchedFrameSet`; `mergeTranscript`). 03-02 added the explicit effect boundary (`effects.ts`: ffprobe duration, ffmpeg scene detection + per-time PNG decode, best-effort transcript) and the **`sample()` entry point** that composes them into a validated `WatchedFrameSet`. Proven by a ffmpeg-`lavfi` golden-clip round-trip. `sample()` is the single surface the router (Phase 4) and `watch` tool (Phase 5) will wrap. 48/48 tests, 0 vulns, no new deps; local-first (system ffmpeg/ffprobe, no required cloud/Whisper).
- **Phase 4 (2026-06-18):** The **router** is shipped (`src/router/`) — a pure, deterministically-tested tier-selection decision unit (DESIGN §2). `classifyQuestion` + `route` + `routeContextFromSet` turn a question + transcript-availability context into an ordered tier escalation chain: spoken+transcript → `[1,2,3]`; spoken-no-transcript / visual / on-screen-text → `[2,3]`; on-screen-text triggers the high-res/OCR path; every chain terminates in tier 3 (universal fallback). "Route, don't answer": the router emits a decision; the `watch` tool (Phase 5) walks the chain and owns confidence-based escalation. 16 new route-asserting specs (48→64), 0 vulns, no new deps; contract + sampler imported as types only (untouched). PR #5 merged (f9c558f).
- **Phase 5 (2026-06-19):** The load-bearing **`watch` pi tool primitive** is shipped (`src/watch/`). `tier-runner.ts` is the pure, pi-free walk core (`walkTierChain` consumes `RoutingDecision.tiers`; `framesToToolResultContent` serializes frames to tool-result `ImageContent`); `extension.ts` is the thin effect boundary that registers `watch` (synchronous `registerTool`, mandatory `promptSnippet` — Phase-1 recipe) and composes `sample() → routeContextFromSet() → route() → walkTierChain()`. **Tier 3 (frames-into-context) is fully implemented and live-verified** (model read red→green→blue scene order from returned frames under `pi --no-extensions -e`), proving tool-result images reach the orchestrator; tiers 1–2 are null-returning `TierRunner` stubs that escalate (real adapters = Phase 6). Package declares `"pi": { extensions: ["./dist/watch/extension.js"] }`. 9 new specs (64→73), 0 vulns; one types-only dep added (`@earendil-works/pi-coding-agent`, peerDependencies "*" + devDep pin); contract/sampler/router imported, untouched. PR #6 merged (d355a91).
- **Phase 6 (2026-06-19):** All three **tier adapters** are real. 06-01 made the `TierRunner` seam async (`walkTierChain` awaits each runner) and shipped tier 1 (transcript passthrough: hands the mm:ss transcript to the orchestrator, else escalates). 06-02 shipped tier 2 (`src/watch/tier2.ts`) — the OpenAI-compatible native-video adapter: pure `buildTier2Request` (serializes frames as ordered `image_url` blocks + text via `toOpenAIContent`) + defensive `parseTier2Answer` + an isolated env-bridge config (`resolveTier2ConfigFromEnv`, `WATCH_TIER2_*`) + an injectable `createTier2Runner`. Adapter = `baseURL` + `model id` (one path for local Qwen3-VL via mlx_vlm.server or a hosted endpoint; no per-model forks); returns `null` on missing config / non-2xx / network error / empty answer so the chain falls through to tier 3. Zero new deps (Node ≥20 global `fetch`); suite 93/93 green. Tier-2 config surface deferred to Phase 7.
- **Phase 7 (2026-06-19):** The **config surface** is shipped (`src/config/`). A pure `resolveWatchConfig(env, overrides?)` resolves one typed `WatchConfig` (tier-2 endpoint, frame budget, resolution, fetch timeout) with precedence **explicit overrides > env > defaults**, replacing the raw `WATCH_TIER2_*` env bridge. The extension boundary resolves it once and builds a config-driven tier-2 runner; per-call `WATCH_PARAMS` (budget/resolution) layer over config defaults. The tier-2 `fetch` is now bounded by a configurable `AbortSignal` timeout that escalates (null) to tier 3 on abort (closing the Phase-6 PETE carry). Suite 105/105; zero new deps; PR #9 merged (7745f07).
- **Phase 8 (2026-06-20):** The **`/watch` command** is shipped (`src/watch/command.ts` + `extension.ts`) — the UX wrapper over the `watch` tool primitive (DESIGN §7 step 5), completing the tool+command pairing the project was built around. A pure parse/prompt/run core (`parseWatchCommand`, `buildWatchPrompt`, `runWatchCommand`) with effects (`ctx.ui.notify`, `pi.sendUserMessage`) injected at the boundary; `pi.registerCommand("watch", …)` is registered synchronously alongside the tool (activation recipe). Load-bearing decision (option-a): the command **delegates to the agent** rather than running the pipeline in a void-returning handler — the only path that preserves tier 3 (frames-into-context must reach the orchestrator, DESIGN §5 #1). Additive only; frozen core untouched; suite 117/117; 0 new deps. Budget/resolution flags + autocomplete deferred.
- **Phase 9 (2026-06-22):** **Batching** shipped as the final v0.1 piece. A new `watch_batch` tool wraps the existing sample → route → tier-walk pipeline over multiple video/question items, backed by a pure `runWatchBatch` core (`src/watch/batch.ts`). Tier 1/2 text results aggregate into a bounded text response (8-item cap, 24k text cap), per-item sync/async failures are isolated, and tier-3 frame-heavy batch items defer to single-video watch follow-up calls instead of inlining many videos' `ImageContent`. Suite now 125/125; PR #11 merged.
- **Phase 10 (2026-06-24):** The local tier-2 model is stood up for real. A uv-pinned Python 3.12 environment outside the repo runs `mlx_vlm==0.6.3`; `mlx_vlm.server` is serving `mlx-community/Qwen3-VL-8B-Instruct-4bit` on port 8080; a smoke POST to `/v1/chat/completions` using base64 `image_url` content returned `HTTP 200` with `CONTENT red`. `docs/TIER2-SETUP.md` captures exact setup, server command, smoke test, troubleshooting, and `WATCH_TIER2_BASE_URL=http://localhost:8080/v1` / `WATCH_TIER2_MODEL=mlx-community/Qwen3-VL-8B-Instruct-4bit`.

## Scope Snapshot
### Active
- v0.1: sampler data contract ✓ → sampler implementation ✓ → router ✓ → `watch` tool primitive ✓ → tier adapters (1/2/3) ✓ → config surface ✓ → `/watch` command ✓ → batching ✓.

### Planned / In progress
- v0.2: Phase 10 local model standup ✓ → Phase 11 live tier-2 wire-shape proof next → Phase 12 diagnostics → Phase 13 release wrap.

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
| Build the `watch` tool as the primitive first; command + batch wrap it | Tool is the load-bearing seam every tier plugs into | 2026-06-18 | ✓ Validated (Phase 5 tool, Phase 8 command) |
| Qwen3-VL is the local tier-2 pick (vs Gemma ≈ frames) | Qwen3-VL has real temporal architecture (3D patch + temporal RoPE) that justifies a real local tier-2 | 2026-06-18 | ✓ Validated (Phase 6) |
| Custom-tool activation works in all modes; print-mode is NOT limited | Phase 1 spike: official example + template fail identically under a `setActiveTools` governor (`pi-loadout`); all pass with `--no-extensions` | 2026-06-18 | Active |
| Ship the real `watch` tool as an installed package and ensure it's in the active loadout | A `setActiveTools`-allowlist governor strips ad-hoc/`-e`-loaded tools from the model-facing set | 2026-06-18 | Active |
| Toolchain = Vitest + TypeBox | TypeBox matches the Phase-1 spike; one schema yields static type + runtime validator; Vitest is TS-native and CI-friendly | 2026-06-18 | Active |
| `WatchedFrameSet` is tier-neutral; OpenAI `content[]` serialization isolated in `serialize.ts` | One in-memory representation reusable by all tiers without leaking wire-format concerns | 2026-06-18 | Active |
| Pure Core, Explicit Effects: all sampler I/O isolated in `effects.ts`; decision/assembly core stays pure | Keeps the load-bearing selection logic deterministic + unit-testable; effects are spawn-only at the boundary | 2026-06-18 | Active |
| Effect spawns use `execFile` arg-arrays only (no shell, no `ref` interpolation) with per-call timeouts | `ref` is caller-supplied → command-injection-safe and bounded by construction | 2026-06-18 | Active |
| `sample()` is the single sampler surface; transcript ships best-effort ("none" fallback) for now | One stable, validator-guaranteed entry point downstream wraps; real caption/Whisper parsing is a deferred extension point that won't change the seam | 2026-06-18 | Active |
| Router is a pure decision unit that emits an ordered tier chain, not an answer ("route, don't answer") | Separates "which path" (pure, deterministically testable) from "run the path + decide if it worked" (effectful, model-dependent); routing is the PRD's un-de-risked hard part so it gets its own test surface | 2026-06-18 | Active |
| On-screen-text intent is classified before spoken (keyword precedence) | OCR phrasing ("what does the sign say") embeds spoken keywords; the high-res path must win | 2026-06-18 | Active |
| `watch` module = pure tier-walk core (`tier-runner.ts`, pi-free) + thin effect boundary (`extension.ts`) | Keeps the tier-walk/serialization logic unit-testable without the pi runtime or ffmpeg; effects (sample, registerTool) stay at the boundary | 2026-06-19 | Active |
| `TierRunner` returns `null` to escalate; tier 3 is total (never null) | Uniform seam: Phase-6 tier 1/2 adapters drop in behind the same signature; the universal fallback can never fail to produce a result | 2026-06-19 | Active |
| ExtensionAPI typed via real `@earendil-works/pi-coding-agent` (peerDependencies "*" + devDep pin), not a hand-rolled shim | docs name the package as the canonical type source; pi bundles it so consumers get host types; type-only import is erased at build (never runtime `dependencies`) | 2026-06-19 | Active |
| (Phase 6) Effectful tier adapters live in their own module (`tier2.ts`); `tier-runner.ts` stays a pure walk core and only references the runner factory | Isolates the watch module's first network/env effect at the boundary; mirrors the serialize.ts/route.ts one-concern split; gives Phase 7 a clean config seam | 2026-06-19 | Active |
| (Phase 6) Tier-2 config via isolated env bridge (`WATCH_TIER2_*`) for now; typed config surface deferred to Phase 7 | Keeps the adapter shippable + testable without pulling Phase-7 scope forward; the env read is a single swappable function | 2026-06-19 | ✓ Superseded (Phase 7: src/config) |
| (Phase 7) Tool config = pure `resolveWatchConfig` over env + explicit overrides, composed at the effect boundary; adapters receive resolved config | Mirrors the pure-core/effect-boundary split; one testable resolver; adapters no longer self-read env | 2026-06-19 | Active |
| (Phase 7) Tier-2 `fetch` carries a configurable AbortSignal timeout; abort escalates (null) to tier 3 | Bounds a slow/hung endpoint without a new failure mode through the host; consistent with null-to-escalate | 2026-06-19 | Active |
| (Phase 7) Defer file-based config + tier-order override | Out of v0.1 scope; env + overrides cover the local-first default flow | 2026-06-19 | Deferred |
| (Phase 8) The `/watch` command delegates to the agent via `pi.sendUserMessage` rather than running the pipeline in the handler | A slash-command handler returns void / can only notify text → it cannot deliver tier-3 frames (ImageContent for the orchestrator, DESIGN §5 #1); delegation reuses the tool path untouched and preserves all three tiers | 2026-06-20 | Active |
| (Phase 8) Defer `/watch` budget/resolution flags + autocomplete | Under agent-delegation the router/config pick budget/resolution from question intent; flags add no v0.1 value | 2026-06-20 | Deferred |
| (Phase 9) Batch surface = new `watch_batch` tool over pure `runWatchBatch`; do not extend existing `watch` | Keeps the proven single-video primitive stable; batch is a wrapper over the existing pipeline | 2026-06-22 | ✓ Validated (Phase 9) |
| (Phase 9) Tier-3 batch is deferred to single-video watch follow-up calls | Frames-for-many-videos needs subagent fan-out and can blow context; v0.1 stays bounded/text-oriented | 2026-06-22 | Deferred enhancement |
| (Phase 10) Start local tier-2 with `mlx-community/Qwen3-VL-8B-Instruct-4bit` | Small/fast, spike-proven baseline; verified reachable; ~5.38 GiB weights versus ~17.01 GiB for 30B-A3B; fastest low-risk way to get a live local endpoint on 48 GB Apple Silicon | 2026-06-24 | Active |

## Links
- `PRD.md` — deeper product-definition context
- `.paul/ROADMAP.md` — milestone and phase structure
- `DESIGN.md` — high-level design seed (source of truth)
- `thinkingSpace/explorations/pi-watch-ideal-design.md` — full exploration history
- `thinkingSpace/prototypes/imagecontent-spike/`, `thinkingSpace/prototypes/qwen-video-spike/` — proof code

---
*Created: 2026-06-18 10:13:09 · Last updated: 2026-06-24 after Phase 10*
