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

## Success Criteria (v0.1)
Concrete, testable definition of done. "Cheapest path that *works*" needs both a correctness bar and a cost bar:

**Correctness ("works"):**
- Golden-clip suite passes: deterministic synthetic fixtures (e.g., the red→green→blue ordering clip and a solid-color clip from the spikes) return correct answers with stable assertions.
- Each tier answers its representative question correctly: tier 1 = a "what's said" question on a clip with captions; tier 2 = a temporal-order question (color sequence); tier 3 = a visual question under an orchestrator with no native video (frames path).
- Router selects the expected tier for each representative question (assert the *route*, not just the answer).
- On-screen-text question triggers the high-res/OCR path and reads the text correctly.

**Cost / performance ("cheapest"):**
- Default frame budget is enforced (~16 frames; tier-3 payload never exceeds the configured cap).
- Tier 1 answers without invoking any vision model (no frame sampling when transcript suffices) — verifiable via the chosen route.
- Local tier-2 round-trip stays within the spike envelope on target hardware (reference: ~3.3s / ~7.6 GB warm RSS for the 6-frame clip) — used as a regression guard, not a hard SLA.

**Robustness ("never required"):**
- Works with **no** cloud key configured (local default path only).
- Degrades gracefully (clear error, not a crash) when: mlx server is down/unreachable, model not downloaded, ffmpeg/yt-dlp missing, or video ref invalid.

## Target Users and Needs
The pi agent and its users: they need to answer questions about videos (what's said, temporal/visual reasoning, on-screen text) without manual transcription and without a mandatory cloud key — running locally on Apple Silicon, with hosted backends as an optional upgrade.

## Requirements
### Must Have
- **Tool-activation resolution (spike first)** — confirm a `pi -e ext.ts`-registered `watch` tool actually enters the active tool set and is executable (TUI and/or print mode). This is the one un-de-risked load-bearing assumption; resolve it before building the sampler (see Risks).
- **Sampler data contract** — the in-memory "watched frame set" type: ordered frames (base64 image blocks + resolution tier), per-frame mm:ss timestamps, aligned transcript segments, source metadata (duration, fps sampled, scene-cut vs backfill origin), on one shared timeline.
- **Sampler implementation** — ffmpeg scene-change extraction (one frame per cut) + uniform backfill + budget cap (~16 frames default, configurable) + resolution policy (low-res default, high-res for on-screen-text) + paired transcript merge (captions/Whisper) on the same timeline.
- **Router (tier selection)** — decides which tier answers a given question and how to escalate when a tier is insufficient. v0.1 scope: a defined, testable policy (heuristic and/or question-classification) that (a) routes "what's said" questions to tier 1, (b) routes temporal/visual questions to tier 2/3, (c) escalates tier 1 → 2/3 when transcript is absent or inadequate, and (d) triggers the high-res/OCR path for on-screen-text questions. Routing logic is its own design artifact, not an afterthought of the tool.
- **`watch` tool primitive** — takes a **video ref** (local file path or URL; URL handling via yt-dlp incl. download lifecycle) + a question, runs the sampler, routes to a tier via the Router, returns an answer.
- **Tier adapters** — tier 1 (transcript summarize), tier 2 (OpenAI-compat video adapter: local Qwen / hosted Gemini), tier 3 (frames → orchestrator `ImageContent`).
- **Config surface** — a user-facing way to set per the "config not code" thesis: tier-2 `baseURL` + `model id`, tier order/enablement, frame budget, resolution thresholds, transcript source. Define the schema and where it lives (extension settings) early — adapters and router both depend on it.
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
- **ffmpeg** (frame sampling), **yt-dlp** (caption fetch + URL download), **Whisper** (transcript fallback — local-first pick: `mlx-whisper` on Apple Silicon), **uv/uvx** — already present on target machine. Note: these are runtime prerequisites cloners must install; document in README.
- **mlx-vlm** server: `uvx --from mlx-vlm mlx_vlm.server --model mlx-community/Qwen3-VL-8B-Instruct-4bit`.
- pi extension host (custom tool + command registration); pi subagent example as backbone for future tier-3 batch.

## Assumptions
- The pi extension tool-activation path can be resolved for the real `watch` tool (TUI vs print mode, auto-discovered ext dir, explicit `setActiveTools` / Context Governor allowlist).
- Local Qwen3-VL footprint stays within budget under real workloads (spike showed warm RSS 7.6 GB).

## Open Questions
- **(Decide early — architectural)** Standalone vs interop with pi-web-access / s2p2-agent (already does Gemini video via `fetch_content`) — reuse patterns or depend on it? Shapes the build; resolve in/before the first planning phase.
- llama.cpp Gemma video maturity (low priority — Qwen is the local pick).
- Exact boi/eoi token plumbing through OpenAI-compatible servers vs raw HF processor.
- `mlx_vlm.server` fps/frame param parity (if we ever use its native video path).

## Testing Strategy
TODD (TDD enforcement) is enabled, but model output is probabilistic — so we test against **deterministic fixtures**, not free-form generation:
- **Golden synthetic clips** as committed fixtures: the spikes' red→green→blue ordering clip and a solid-color clip give stable, assertable answers. Add a captioned clip (tier 1) and an on-screen-text clip (high-res/OCR path).
- **Assert routes, not just answers:** the Router is pure decision logic — unit-test tier selection and escalation deterministically, independent of any model call.
- **Sampler is deterministic:** given a fixed clip + budget, assert exact frame count, timestamps, and scene-cut-vs-backfill origin.
- **Adapters mockable:** the OpenAI-compatible wire shape lets us test tier plumbing against a stub server without a live model; gate live-model tests behind a marker so CI/no-GPU envs skip them.
- **Graceful-degradation tests:** simulate mlx-server-down, missing binary, and invalid video ref → assert clear error, not crash.

## Risks
- **[Load-bearing, un-de-risked] Tool activation:** a `pi -e ext.ts`-registered tool did NOT enter the active tool set in print mode during spike #1 (the official `dynamic-tools.ts` example had the same issue). If unresolved, the entire `watch` tool path is blocked. **Mitigation: front-load a minimal activation spike as the first phase — before building the sampler.** Unlike the two proven spikes, this is still an assumption.
- **Router quality:** "pick the cheapest tier that works" is the actual hard part and is not yet de-risked. Bad routing = wrong answers or wasted cost. Mitigation: treat routing as its own design + deterministic test surface; start with a conservative escalate-on-insufficiency policy.
- **Token blowup on long videos:** frame budget cap + transcript-first routing are the guardrails; verify the cap is enforced end-to-end.
- **mlx server lifecycle:** who starts/owns `mlx_vlm.server`, and what happens on cold start / model-not-downloaded. Mitigation: explicit health check + graceful degradation.

## Recommended Direction
**Risk-first**, then the DESIGN.md §7 build order:
1. **Tool-activation spike** — prove the `watch` tool can run before building anything for it.
2. **Sampler data contract** — the "watched frame set" type.
3. **Sampler implementation** — ffmpeg scene-change + backfill + transcript merge (with golden-clip fixtures).
4. **Router** — tier-selection + escalation policy as its own tested unit.
5. **`watch` tool primitive** — wire ref + question → sampler → router → answer.
6. **Tier adapters** — tier 1 (transcript), tier 2 (OpenAI-compat video), tier 3 (frames → orchestrator).
7. **Config surface** — `baseURL`/`model id`, tier order, frame budget, resolution thresholds.
8. **`/watch` command** — UX wrapper.
9. **Batching** — tiers 1/2 via `Promise.all`; tier-3 fan-out deferred.

Own the sampler; keep the model end a swappable OpenAI-compatible adapter so local-vs-hosted is config, not code.

## Supporting References
- `.paul/PROJECT.md`
- `DESIGN.md`
- `thinkingSpace/ideas/pi-watch-extension.md` — original seed
- `thinkingSpace/explorations/pi-watch-ideal-design.md` — full chronological exploration
- `thinkingSpace/explorations/pi-watch-HANDOFF.md` — session map
- `thinkingSpace/prototypes/imagecontent-spike/`, `thinkingSpace/prototypes/qwen-video-spike/` — proof code

---
*Created: 2026-06-18 10:13:09*
