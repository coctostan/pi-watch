# pi-watch — High-Level Design

> A pi extension that lets the agent **watch videos** — answer questions about
> them by picking the cheapest path that works, with first-class support for
> **local** models (no Gemini required) and room to **batch** many videos.
>
> Status: **feasibility proven** (2026-06-17). Two load-bearing unknowns
> de-risked with runtime spikes. This doc is the design seed for the build.
> Full exploration history lives in `thinkingSpace/explorations/pi-watch-ideal-design.md`.

---

## 1. Goal & constraints

**What we're building**
- A real **`watch` tool** (the primitive) and a **`/watch` command** (the UX).
- Designed to **expand to batching** multiple videos.

**Hard constraints / preferences**
- Prefer **not depending on Gemini**. Cloud is optional, never required.
- Strong interest in **local** inference.
- Target machine: **MacBook Pro M4 Pro, 48 GB unified RAM** (Apple Silicon).

**Non-goals (for now)**
- Not copying claude-watch's always-sample-every-frame approach (lossy + costly).
- Not building subagent fan-out batching yet (only tier-3 batch needs it).

---

## 2. Core architecture: tiered router + one shared sampler

"Watching" a video = **pick the cheapest path that answers the question.**

| Tier | Path | When | Cost |
|------|------|------|------|
| **1** | **Transcript** — yt-dlp captions, else Whisper | Question is about *what's said* | Cheapest, model-agnostic |
| **2** | **Native video understanding** — pluggable video model | Question needs *temporal/visual* reasoning | Medium; local or hosted |
| **3** | **Frames-into-context** — sample frames, hand to the orchestrator model as `ImageContent` | Universal visual fallback (works under any vision LLM) | Most tokens, always available |

### The key insight (verified at code level)
**Native video and frame-sampling are the same mechanism underneath.** So:

> **WE own the sampling.** The model end is a thin, swappable,
> **OpenAI-compatible adapter.**

Build **one good sampler**; then local-vs-hosted and which-model become
**config, not code forks**. This is the load-bearing design decision.

```
                ┌─────────────────────────────────────────────┐
   video ─────► │  SAMPLER (ours)                             │
   + question   │  ffmpeg scene-change + uniform backfill,    │
                │  budget-capped, timestamps, + transcript    │
                └───────────────┬─────────────────────────────┘
                                │  "watched frame set"
                                │  (frames + mm:ss + transcript, one timeline)
                ┌───────────────▼─────────────────────────────┐
   router  ───► │  pick tier                                  │
                └───┬───────────────┬──────────────────┬──────┘
                    │ tier 1        │ tier 2           │ tier 3
                    ▼               ▼                  ▼
              transcript      OpenAI-compat       ImageContent
              summarize       video adapter       → orchestrator
                              (local Qwen /        (Claude/GPT)
                               hosted Gemini)
```

---

## 3. The sampler (the heart of it)

**Ideal default sampler:**
- **ffmpeg scene-change extraction** — one frame per cut (not blind fps).
- **Uniform backfill** — fill gaps so long static stretches still get coverage.
- **Budget-capped** — ~16 frames default; configurable.
- **Resolution policy** — low-res by default; high-res only for on-screen-text
  questions (OCR-ish).
- **mm:ss timestamps** per frame.
- **Paired transcript** on the **same timeline** (captions/Whisper).

Output is a single **"watched frame set"** object — see §6, the next thing to design.

---

## 4. Model adapters (tier 2)

All tier-2 backends speak the **same OpenAI `/v1/chat/completions` shape**
(`image_url` blocks + text). Adapter = `baseURL` + `model id`. Confirmed
swap-in-trivial by spike.

**Recommended local default (this machine):**
- **`mlx-community/Qwen3-VL-8B-Instruct-4bit`** via `mlx_vlm.server`.
- Qwen3-VL has *real* temporal architecture (3D patch + temporal RoPE) — it's
  the model that **justifies** a real local tier-2 over plain frame-dumping.
- Install ≈ one line: `uvx --from mlx-vlm mlx_vlm.server --model ...`
  (ffmpeg + yt-dlp + uv already present).

**Optional upgrade:** Gemini tier-2 if the user ever adds a key. Not required.

**Why not the obvious alternatives:**
- **Only Gemini** ingests video among the big-3 orchestrators. Claude = no,
  GPT = image-only (OpenAI "video" = Sora generation, not input). → **tier 3 is
  the only in-context visual path under Claude/GPT.** Frames are the foundation.
- **Ollama does not accept video** (image-only). Gemma-on-Ollama = frames only.
- Local native video lives **off-Ollama**: **vLLM (CUDA)** or **MLX (Apple)**.
- Gemma's "temporal grounding" is just interleaved mm:ss text → for Gemma,
  native video ≈ our frame sampling (marginal gain). Qwen is the differentiator.

---

## 5. Verified facts (runtime-proven — do not relitigate)

### ✅ #1 — Tool-result images reach the orchestrator model
Built-in `read` on a solid-magenta PNG → **Claude (opus-4.6) answered "Magenta."**
The provider payload carried a real Anthropic image block
(`{type:"image", source:{type:"base64", media_type:"image/png", data}}`) inside
the `tool_result`. Tier 3 foundation is real.
- Type chain: `AgentToolResult.content: (TextContent | ImageContent)[]`, commented
  *"Text or image content returned to the model."*
- Vision-gating seam exists: non-vision models degrade to a labelled text
  placeholder (`downgradeUnsupportedImages`), not a crash. → model-agnostic-safe.
- Spike: `thinkingSpace/prototypes/imagecontent-spike/`.

### ✅ #2 — Local Qwen3-VL tier-2 works end-to-end
ffmpeg-sampled a red→green→blue clip to 6 frames, pushed as base64 `image_url`
blocks (NOT a video file) to `mlx_vlm.server` → **answer: `red -> green -> blue`,
correct, in 3.3s.** Temporal *order* understood, not just "I see colors."
- **Warm RSS 7.6 GB**, system 92% free. Footprint matches prediction; the old
  memory-pressure caveat is retired for the 8B-4bit tier.
- Same OpenAI wire shape as hosted → adapter is just baseURL + model id.
- Checkpoint ships `video_preprocessor_config.json` (native video also available
  if we ever want it; frames-as-images path is proven).
- Spike: `thinkingSpace/prototypes/qwen-video-spike/` (clip.mp4, frames/, ask.py).

### Other established facts
- pi has a **subagent example** (`examples/extensions/subagent/`) — spawns
  isolated pi processes. Backbone for tier-3 batch IF ever needed.
- **Batching** is trivial for tiers 1/2 (text out → `Promise.all`). Only tier-3
  batch (frames for many videos) needs subagent fan-out — **defer it.**

---

## 6. Next thing to design: the "watched frame set" data contract

This is the **seam every tier plugs into** — design before coding.

A watched frame set should carry, on **one shared timeline**:
- ordered **frames** (base64 image blocks, with resolution tier)
- per-frame **mm:ss timestamps**
- aligned **transcript** segments
- source metadata (duration, fps sampled, scene-cut vs backfill origin)

Both spikes already tell us exactly what it must *feed downstream*:
**ordered base64 image blocks + interleaved text**, in OpenAI `content[]` shape.
That's the serialization target; the contract is the in-memory representation
that the sampler produces and every tier consumes.

---

## 7. Build order (proposed)

1. **Sampler data contract** (§6) — the in-memory "watched frame set" type.
2. **Sampler implementation** — ffmpeg scene-change + backfill + transcript merge.
3. **`watch` tool primitive** — takes a video ref + question, runs sampler,
   routes to a tier, returns answer.
   - ⚠️ **Resolve the print-mode tool-activation gotcha** (below) here.
4. **Tier adapters** — tier 1 (transcript), tier 2 (Qwen/Gemini OpenAI-compat),
   tier 3 (frames → orchestrator `ImageContent`).
5. **`/watch` command** — UX wrapper over the tool.
6. **Batching** — `Promise.all` over tiers 1/2 first; subagent fan-out for tier-3
   batch only if/when needed.

### Known build-time gotcha (not a feasibility blocker)
Custom tools registered by a `pi -e ext.ts` extension **did not enter the active
tool set in print mode (`-p`)** during spike #1 — the payload `tools[]` was a
fixed governor-managed set, and the tool was advertised but not executable
("Tool not found"). The official `dynamic-tools.ts` example had the same issue.
**Action:** confirm the supported activation path (TUI vs print mode, global
auto-discovered ext dir, explicit `setActiveTools` / Context Governor allowlist)
when wiring the real `watch` tool.

---

## 8. Open / deferred questions

- Standalone vs interop with **pi-web-access / s2p2-agent** (existing extension
  that already does Gemini video via `fetch_content`; no `/watch`, no batching,
  no frames-into-context). Reuse patterns vs depend on it.
- llama.cpp Gemma video maturity (low priority — Qwen is the local pick).
- Exact boi/eoi token plumbing through OpenAI-compatible servers vs raw HF
  processor.
- `mlx_vlm.server` fps/frame param parity (if we ever use its native video path
  instead of pushing our own frames).

---

## 9. Decided / rejected (don't reopen without reason)

- ❌ claude-watch's always-sample-frames approach (lossy, expensive).
- ❌ Gemini as a mandatory dependency.
- ❌ Ollama for native video (can't — image only).
- ⏸️ Subagent fan-out batching (only needed for tier-3 batch; defer).
- ✅ Build the `watch` **tool** as the primitive first; command + batch wrap it.
- ✅ Qwen3-VL is what makes local tier-2 worth it (vs Gemma ≈ frames).

---

## Provenance

Distilled from a multi-session exploration in `thinkingSpace/`:
- `ideas/pi-watch-extension.md` — original seed.
- `explorations/pi-watch-ideal-design.md` — full chronological exploration with
  VERIFIED/confidence flags (the deep doc).
- `explorations/pi-watch-HANDOFF.md` — session map.
- `prototypes/imagecontent-spike/`, `prototypes/qwen-video-spike/` — proof code.
