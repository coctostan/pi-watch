# Product Requirements: pi-watch

## Problem / Opportunity
The pi agent cannot watch videos. Existing approaches force a tradeoff: either depend on a single cloud video API (Gemini — the only big-3 orchestrator that ingests video) or blindly dump every frame into context (claude-watch style — lossy and expensive). There is no cheap, local-first, model-agnostic path for answering questions about a video.

## Why This Direction Remains Relevant

Feasibility was proven on 2026-06-17 and the risk-first design has shipped through v0.4. The product remains useful because it avoids both a mandatory single-cloud video API and unbounded frame dumping while supporting real local inference on the target M4 Pro hardware.

## Current State / Existing System Context

- v0.4.0 is a production Pi extension with registered `watch` and `watch_batch` tools plus the `/watch` command. It owns bounded frame sampling and routes transcript-first → sampled-frame tier 2 → frames-into-context.
- Tool activation is verified across supported run modes; the earlier print-mode failure was caused by an external active-tool allowlist rather than Pi registration.
- Local Qwen3-VL tier 2 is validated through the generic OpenAI-compatible sampled-image wire shape; cloud providers remain optional.
- Supported YouTube captions are preferred for spoken questions. When explicitly enabled and captions are absent, bounded local `mlx_whisper` ASR can supply timestamped English transcript segments; every failure preserves visual fallback.
- **M4 audit reconciliation:** This section was updated from its pre-production snapshot through approved finding F6 in the M4 adherence audit (`.paul/audits/M4-AUDIT.md`).

## Desired Outcome
The shipped `watch` primitive, `/watch` command, and `watch_batch` wrapper answer video questions through the cheapest available path—timestamped transcript, sampled-frame vision endpoint, or frames-into-context—while defaulting to local inference and preserving bounded fallback.

## Success Criteria (v0.1)
Concrete, testable definition of done. "Cheapest path that *works*" needs both a correctness bar and a cost bar:

**Correctness ("works"):**
- **R2/R3/R4/R6/R13:** Golden-clip suite passes: deterministic synthetic fixtures (e.g., the red→green→blue ordering clip and a solid-color clip from the spikes) return correct answers with stable assertions.
- **R4/R6:** Each tier answers its representative question correctly: tier 1 = a "what's said" question on a clip with captions; tier 2 = a temporal-order question (color sequence); tier 3 = a visual question under an orchestrator with no native video (frames path).
- **R4:** Router selects the expected tier for each representative question (assert the *route*, not just the answer).
- **R3/R4:** On-screen-text question triggers the high-res/OCR path and reads the text correctly.

**Cost / performance ("cheapest"):**
- **R3/R7/R13:** Default frame budget is enforced (~16 frames; tier-3 payload never exceeds the configured cap).
- **R4/R6:** Tier 1 answers without invoking any vision model (no frame sampling when transcript suffices) — verifiable via the chosen route.
- **R6:** Local tier-2 round-trip stays within the spike envelope on target hardware (reference: ~3.3s / ~7.6 GB warm RSS for the 6-frame clip) — used as a regression guard, not a hard SLA.

**Robustness ("never required"):**
- **R14:** Works with **no** cloud key configured (local default path only).
- **R5/R6/R14:** Degrades gracefully (clear error, not a crash) when: mlx server is down/unreachable, model not downloaded, ffmpeg/yt-dlp missing, or video ref invalid.

## Target Users and Needs
The pi agent and its users: they need to answer questions about videos (what's said, temporal/visual reasoning, on-screen text) without manual transcription and without a mandatory cloud key — running locally on Apple Silicon, with hosted backends as an optional upgrade.

## Requirement ID Convention

Every requirement in every bucket has one globally unique `R#` ID. IDs are never renumbered or reused; moving or deferring a requirement preserves its ID.

## Requirements
### Must Have
- **R1** — **Tool activation** — a registered `watch` tool enters the active tool set and is executable across supported Pi run modes; when an external active-tool governor controls that set, installation guidance must make the required allowlisting or enablement explicit.
- **R2** — **Sampler data contract** — the in-memory "watched frame set" type: ordered frames (base64 image blocks + resolution tier), per-frame mm:ss timestamps, aligned transcript segments, source metadata (duration, fps sampled, scene-cut vs backfill origin), on one shared timeline.
- **R3** — **Sampler implementation** — ffmpeg scene-change extraction (one frame per cut) + uniform backfill + budget cap (~16 frames default, configurable) + resolution policy (low-res default, high-res for on-screen-text) + paired transcript merge (captions/Whisper) on the same timeline.
- **R4** — **Router (tier selection)** — decides which tier answers a given question using a defined, deterministic policy: spoken, broad, and mixed spoken/visual questions with a non-empty in-range transcript may start at tier 1; transcript misses and explicitly visual/temporal questions use tiers 2/3; on-screen-text questions select the high-resolution OCR route; broad-only prompts do not enable local ASR, while spoken and mixed prompts retain captions-first ASR eligibility; every route ends in tier 3. Transcript semantic adequacy/confidence scoring is not part of the current router contract. *(Amended by Phase 22 plan 22-01; provenance: `.paul/phases/22-route-before-decoding/22-01-SUMMARY.md`.)*
- **R5** — **`watch` tool primitive** — takes a **video ref** (a local file path or an explicitly supported YouTube watch/short-link/shorts URL resolved through bounded yt-dlp ownership and cleanup) plus a question, optionally bounded by supported URL timestamps or explicit whole-second `start` / `end` values (single call, or shared across a batch), runs the sampler over that one absolute half-open range, routes to a tier, and returns an answer. *(Amended by Phase 21 plan 21-01; provenance: `.paul/phases/21-range-aware-evidence/21-01-SUMMARY.md`.)*
- **R6** — **Tier adapters** — tier 1 (timestamped transcript delivery), tier 2 (generic OpenAI-compatible sampled-frame vision adapter for local or hosted endpoints), and tier 3 (frames → orchestrator `ImageContent`).
- **R7** — **Config surface** — typed user-facing controls for tier-2 `baseURL` and model id, frame budget, resolution, fetch timeout, and bounded local-ASR enablement/runtime policy. Tier ordering remains fixed, and transcript-source policy remains captions-first with explicitly enabled local ASR as the fallback.
- **R8** — **`/watch` command** — UX wrapper over the tool.

### Should Have / Nice to Have
- **R9** — Batching for tiers 1/2 runs items concurrently, preserves input order, isolates per-item failures, and returns bounded text output (`Promise.allSettled` is the current implementation).

### Explicitly Deferred
- **R10** — Tier-3 batch via subagent fan-out (only needed for frames-for-many-videos).
- **R11** — Optional Gemini tier-2 upgrade (only if a user adds a key).
- **R12** — Native-video ingestion through `mlx_vlm.server` (the implemented tier-2 path pushes sampled image blocks instead).

### Out of Scope
- **R13** — claude-watch's always-sample-every-frame approach (lossy, expensive).
- **R14** — Gemini / cloud as a mandatory dependency.
- **R15** — Ollama for native video (image-only — cannot).

### Shipped Must Have — v0.4 Local Speech

- **R16** — **Explicit local-ASR eligibility** — local ASR is disabled by default and may run only when explicitly enabled, the question has spoken intent, and preferred caption acquisition produced no transcript.
- **R17** — **Thin local-ASR adapter** — invoke a configured direct `mlx_whisper` executable to obtain validated timestamped English transcript segments without hidden package installation, service management, or mandatory network work.
- **R18** — **Finite ASR resource policy** — enforce hard media-duration, process-timeout, and output-size bounds that callers cannot increase beyond compiled ceilings.
- **R19** — **Private typed ASR diagnostics** — expose actionable typed failure reasons without refs, transcript text, stderr, credentials, model-cache paths, or environment values.
- **R20** — **ASR ownership and cleanup** — remove only adapter-created temporary output; caller media and user-managed package/model caches remain borrowed and untouched.
- **R21** — **Universal ASR fallback** — ASR failure yields no ASR transcript and preserves the existing visual tier chain rather than crashing or fabricating text; when valid captions make ASR ineligible, the caption transcript remains intact.
- **R22** — **Local-speech operability proof** — document setup and remediation, prove deterministic failure/fallback through the manifest-declared compiled registration, and keep real-model verification exact-opt-in, finite, and default-skipped.

**M4 audit provenance:** R1, R4–R7, R9, R12, and R21 were clarified and R16–R22 were added through approved `accept-reality` routes F1, F3–F7, F10, F12, F13, and F16 in the M4 adherence audit (`.paul/audits/M4-AUDIT.md`). Stable IDs were not renumbered or reused.

## Constraints & Dependencies
### Constraints
- Cloud optional, never required; prefer no Gemini dependency.
- Local-first inference; target = MacBook Pro M4 Pro, 48 GB unified RAM (Apple Silicon).
- All tier-2 backends speak the same OpenAI `/v1/chat/completions` shape (`image_url` blocks + text) → adapter = `baseURL` + `model id`.

### Dependencies / Integrations
- **ffmpeg** (frame sampling), **yt-dlp** (caption fetch + URL download), **Whisper** (transcript fallback — local-first pick: `mlx-whisper` on Apple Silicon), **uv/uvx** — already present on target machine. Note: these are runtime prerequisites cloners must install; document in README.
- **mlx-vlm** server: `uvx --from mlx-vlm mlx_vlm.server --model mlx-community/Qwen3-VL-8B-Instruct-4bit`.
- pi extension host (custom tool + command registration); pi subagent example as backbone for future tier-3 batch.

## Validated Foundations and Operating Assumptions

- Tool activation is validated across supported run modes; external active-tool allowlists remain an installation concern rather than a Pi registration limitation.
- Local Qwen3-VL was measured at roughly 7.6 GB warm RSS on the target machine; continued performance under broader workloads remains an operating assumption, not a hard SLA.
- ffmpeg, yt-dlp, optional `mlx_whisper`, and optional tier-2 model services remain user-managed runtime prerequisites.

## Open Questions / Future Research

- llama.cpp/Gemma video maturity relative to the current Qwen baseline.
- Exact boi/eoi token plumbing through OpenAI-compatible servers versus raw Hugging Face processors.
- `mlx_vlm.server` fps/frame parameter parity if native-video ingestion is ever implemented.

## Testing Strategy
TODD (TDD enforcement) is enabled, but model output is probabilistic — so we test against **deterministic fixtures**, not free-form generation:
- **R2/R3/R4/R6/R13/R22:** Golden synthetic clips as committed fixtures; use stable, assertable media evidence rather than probabilistic free-form generation. Evidence: `test/sampler/select-frames.test.ts`, `test/router/route.test.ts`, `test/watch/tier-runner.test.ts`, and `test/watch/asr-e2e.test.ts`.
- **R4/R16/R21:** Assert routes, not just answers: unit-test deterministic tier selection, eligibility, and fallback independently of model calls. Evidence: `test/router/route.test.ts`, `test/sampler/sample.test.ts`, and `test/watch/extension.test.ts`.
- **R2/R3/R13/R18:** Keep sampler and resource-policy evidence deterministic: assert frame counts, timestamps, origins, and hard bounds on fixed fixtures. Evidence: `test/contract/watched-frame-set.test.ts`, `test/sampler/select-frames.test.ts`, and `test/sampler/asr.test.ts`.
- **R6/R17/R22:** Keep adapters mockable through the OpenAI-compatible wire shape and direct executable seam; gate live-model tests behind exact opt-in flags. Evidence: `test/watch/tier2.test.ts`, `test/sampler/asr.test.ts`, and `test/watch/asr-e2e.test.ts`.
- **R5/R6/R19/R21:** Exercise graceful degradation for unavailable endpoints/binaries and invalid refs, asserting typed private diagnostics and fallback rather than crashes. Evidence: `test/sampler/effects.test.ts`, `test/watch/tier2-diagnostics.boundary.test.ts`, and `test/watch/asr-e2e.test.ts`.

M4 acceptance provenance is summarized in `.paul/phases/17-bounded-asr-foundation/17-01-SUMMARY.md`, `.paul/phases/18-local-transcript-fallback/18-01-SUMMARY.md`, and `.paul/phases/19-local-speech-ux-and-proof/19-01-SUMMARY.md`. Those historical artifacts retain their original phase-local AC labels; the M4 audit records explicit R1–R22 no-tag-found results rather than retroactively rewriting evidence.

## Current Risks

- **OCR resolution composition (R3/F2):** resolved in Phase 22 plan 22-01; question-derived high resolution is applied before frame decoding in single and batch watch paths. Provenance: `.paul/phases/22-route-before-decoding/22-01-SUMMARY.md`.
- **External runtime availability:** ffmpeg, yt-dlp, local model services, and optional `mlx_whisper` may be missing or unavailable; typed diagnostics and visual fallback must remain bounded and private.
- **Resource growth:** long media, transcripts, frames, and external model work require the existing hard budgets, timeouts, output caps, and text limits.
- **Model/service lifecycle:** local model startup, model downloads, cache ownership, and endpoint health remain operator-managed concerns.
- **Dependency maintenance:** the unchanged development tree retains known non-critical advisories tracked outside the shipped runtime behavior.

## Delivered Direction and Follow-up

The original risk-first DESIGN.md §7 sequence—activation, sampler contract/implementation, router, tool, adapters, config, command, and batching—was completed in Phases 1–9. Later milestones validated local tier 2, YouTube/captions, and bounded local ASR without changing the core ownership model.

The enduring direction is to own sampling and keep model backends thin OpenAI-compatible adapters selected by configuration rather than model-specific forks. Outstanding audit-routed work is recorded in `.paul/audits/M4-AUDIT.md`; future product scope belongs in the next ROADMAP milestone rather than in the completed historical build sequence.

**M4 audit reconciliation:** Why Now, Desired Outcome, R1, validated assumptions, open questions, testing links, risks, and delivered direction were reconciled through approved F13 in `.paul/audits/M4-AUDIT.md`.

## Supporting References
- `.paul/PROJECT.md`
- `DESIGN.md`
- `thinkingSpace/ideas/pi-watch-extension.md` — original seed
- `thinkingSpace/explorations/pi-watch-ideal-design.md` — full chronological exploration
- `thinkingSpace/explorations/pi-watch-HANDOFF.md` — session map
- `thinkingSpace/prototypes/imagecontent-spike/`, `thinkingSpace/prototypes/qwen-video-spike/` — proof code

---
*Created: 2026-06-18 10:13:09*
