# Product Requirements: pi-watch

## Problem / Opportunity
The pi agent cannot watch videos. Existing approaches force a tradeoff: either depend on a single cloud video API (Gemini — the only big-3 orchestrator that ingests video) or blindly dump every frame into context (claude-watch style — lossy and expensive). There is no cheap, local-first, model-agnostic path for answering questions about a video.

## Why Now
Feasibility was proven on 2026-06-17. Two load-bearing unknowns were de-risked with runtime spikes, so the design is no longer speculative — it's ready to build. The target hardware (M4 Pro, 48 GB) comfortably runs a real local video model.

## Current State / Existing System Context
- No production code yet. `DESIGN.md` is the design seed.
- **Verified fact #1:** Tool-result images reach the orchestrator model. Built-in `read` on a solid-magenta PNG → Claude (opus-4.6) answered "Magenta." Provider payload carried a real Anthropic image block inside the `tool_result`. Vision-gating seam exists (`downgradeUnsupportedImages`) so non-vision models degrade to a labelled text placeholder, not a crash. → tier 3 is real and model-agnostic-safe.
- **Verified fact #2:** Local Qwen3-VL tier-2 works end-to-end. ffmpeg-sampled a red→green→blue clip to 6 frames, pushed as base64 `image_url` blocks to `mlx_vlm.server` → correct ordered answer in 3.3s, warm RSS 7.6 GB. Same OpenAI wire shape as hosted.
- Related extension exists: pi-web-access / s2p2-agent already does Gemini video via `fetch_content` (no `/watch`, no batching, no frames-into-context) — open question whether to reuse patterns or depend on it.

## Desired Outcome
A real `watch` tool (the primitive) and a `/watch` command (the UX) that "watch" a video by picking the cheapest path that answers the question, defaulting to local inference, with a clean seam for batching later.

## Target Users and Needs
The pi agent and its users: they need to answer questions about videos (what's said, temporal/visual reasoning, on-screen text) without manual transcription and without a mandatory cloud key — running locally on Apple Silicon, with hosted backends as an optional upgrade.

## Requirements
### Must Have
- **Sampler data contract** — the in-memory "watched frame set" type: ordered frames (base64 image blocks + resolution tier), per-frame mm:ss timestamps, aligned transcript segments, source metadata (duration, fps sampled, scene-cut vs backfill origin), on one shared timeline.
- **Sampler implementation** — ffmpeg scene-change extraction (one frame per cut) + uniform backfill + budget cap (~16 frames default, configurable) + resolution policy (low-res default, high-res for on-screen-text) + paired transcript merge (captions/Whisper) on the same timeline.
- **`watch` tool primitive** — takes a video ref + question, runs the sampler, routes to a tier, returns an answer. Must resolve the print-mode tool-activation gotcha here.
- **Tier adapters** — tier 1 (transcript summarize), tier 2 (OpenAI-compat video adapter: local Qwen / hosted Gemini), tier 3 (frames → orchestrator `ImageContent`).
- **`/watch` command** — UX wrapper over the tool.

### Should Have / Nice to Have
- Batching for tiers 1/2 via `Promise.all` (text out).

### Explicitly Deferred
- Tier-3 batch via subagent fan-out (only needed for frames-for-many-videos).
- Optional Gemini tier-2 upgrade (only if a user adds a key).
- `mlx_vlm.server` native video path (we push our own frames; native is available but unused).

### Out of Scope
- claude-watch's always-sample-every-frame approach (lossy, expensive).
- Gemini / cloud as a mandatory dependency.
- Ollama for native video (image-only — cannot).

## Constraints & Dependencies
### Constraints
- Cloud optional, never required; prefer no Gemini dependency.
- Local-first inference; target = MacBook Pro M4 Pro, 48 GB unified RAM (Apple Silicon).
- All tier-2 backends speak the same OpenAI `/v1/chat/completions` shape (`image_url` blocks + text) → adapter = `baseURL` + `model id`.

### Dependencies / Integrations
- **ffmpeg** (frame sampling), **yt-dlp** (captions), **Whisper** (transcript fallback), **uv/uvx** — already present on target machine.
- **mlx-vlm** server: `uvx --from mlx-vlm mlx_vlm.server --model mlx-community/Qwen3-VL-8B-Instruct-4bit`.
- pi extension host (custom tool + command registration); pi subagent example as backbone for future tier-3 batch.

## Assumptions
- The pi extension tool-activation path can be resolved for the real `watch` tool (TUI vs print mode, auto-discovered ext dir, explicit `setActiveTools` / Context Governor allowlist).
- Local Qwen3-VL footprint stays within budget under real workloads (spike showed warm RSS 7.6 GB).

## Open Questions
- Standalone vs interop with pi-web-access / s2p2-agent — reuse patterns or depend on it?
- llama.cpp Gemma video maturity (low priority — Qwen is the local pick).
- Exact boi/eoi token plumbing through OpenAI-compatible servers vs raw HF processor.
- `mlx_vlm.server` fps/frame param parity (if we ever use its native video path).

## Recommended Direction
Build in the order from `DESIGN.md` §7: (1) sampler data contract, (2) sampler implementation, (3) `watch` tool primitive (resolve print-mode gotcha), (4) tier adapters, (5) `/watch` command, (6) batching. Own the sampler; keep the model end a swappable OpenAI-compatible adapter so local-vs-hosted is config, not code.

## Supporting References
- `.paul/PROJECT.md`
- `DESIGN.md`
- `thinkingSpace/ideas/pi-watch-extension.md` — original seed
- `thinkingSpace/explorations/pi-watch-ideal-design.md` — full chronological exploration
- `thinkingSpace/explorations/pi-watch-HANDOFF.md` — session map
- `thinkingSpace/prototypes/imagecontent-spike/`, `thinkingSpace/prototypes/qwen-video-spike/` — proof code

---
*Created: 2026-06-18 10:13:09*
