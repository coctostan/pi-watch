# pi-watch

`pi-watch` gives a Pi agent a `watch` tool for answering questions about local videos and supported YouTube URLs using the cheapest available path that works.

It owns one budget-capped sampler and routes each question through three tiers:

| Tier | Path | Typical use |
|---|---|---|
| 1 | Caption transcript or explicitly enabled local English ASR | Questions about what was said |
| 2 | OpenAI-compatible vision endpoint | Optional local or hosted visual reasoning |
| 3 | Sampled frames returned as Pi `ImageContent` | Universal visual fallback for the orchestrator |

Cloud access is not required. Tier 2 and local ASR are both optional. A supported YouTube URL uses local `yt-dlp`, `ffprobe`, and `ffmpeg` executables and necessarily contacts YouTube; first-time user-managed ASR setup may also download packages or model weights.

## Features

- Real Pi `watch` tool plus a `/watch` convenience command.
- Local files and three supported YouTube URL forms.
- Scene-change sampling with gap backfill, frame budgets, and timestamps.
- Deterministic half-open source ranges from supported YouTube timestamps or explicit whole-second `start` / `end` bounds.
- Human YouTube captions first, with one automatic-caption fallback.
- Exact-opt-in, bounded local English speech transcription through a user-managed `mlx_whisper` executable.
- Explicit tier escalation: transcript → optional vision endpoint → frames.
- Private typed ASR/tier-2 diagnostics and visual degradation on failure.
- Caller URL preservation and cleanup limited to adapter/resolver-owned temporary files.
- Default-off live tests, so the normal suite does not require YouTube, a speech model, or a vision server.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer.
- [Pi](https://pi.dev/).
- `ffmpeg` and `ffprobe` on `PATH`.
- `yt-dlp` on `PATH` for YouTube URLs. Local-file watching does not require it.
- Optional local speech: Apple Silicon macOS plus a user-managed compatible `mlx_whisper` executable and model. See [Local speech transcription setup](docs/LOCAL-ASR-SETUP.md).

Install Pi using its documented npm command if needed:

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

Check the external media tools:

```bash
node --version
yt-dlp --version
ffmpeg -version
ffprobe -version
```

See [YouTube setup and troubleshooting](docs/YOUTUBE-SETUP.md) for supported URL scope and operational details.

## Installation

Pi packages run with full system access. Review third-party package source before installation.

### Clone and install from a local path

Use this path for local development or the current v0.4.0 checkout:

```bash
git clone https://github.com/coctostan/pi-watch.git
pi install ./pi-watch
pi list
```

A local-path Pi package points at the clone rather than copying it. Restart Pi or run `/reload` after rebuilding or updating the package. If the extension is installed but disabled, use `pi config` to enable it.

### Install a tagged Git release

The repository commits its compiled `dist/` extension so Pi's Git-package install can load `dist/watch/extension.js` without development-only build tooling.

After the `v0.4.0` tag has actually been published, the pinned command is:

```bash
pi install git:github.com/coctostan/pi-watch@v0.4.0
```

Until that tag exists, use the local/current-checkout workflow above rather than treating the future tag command as released.

> **Do not run `pi install npm:pi-watch`.** The unscoped npm package named `pi-watch` is an unrelated registry project. This repository is supported through its Git repository or a local clone; a scoped npm rename/publication remains deferred.

## Usage

### Ask the agent to use the tool

For a local file:

```text
Use the watch tool with ref "./demo.mp4" and question "What changes after the title card?"
```

For YouTube:

```text
Use the watch tool with ref "https://youtu.be/jNQXAC9IVRw" and question "What does the speaker say?"
```

The model-facing tool accepts this shape:

```json
{
  "ref": "https://www.youtube.com/watch?v=jNQXAC9IVRw&t=30s",
  "question": "What happens in this section?",
  "start": 45,
  "end": 90,
  "budget": 8,
  "resolution": "low"
}
```

`start`, `end`, `budget`, and `resolution` are optional. `start` is inclusive and `end` is exclusive; both explicit fields are non-negative, conversion-safe whole seconds. An explicit `start` overrides a supported YouTube `start` or `t` timestamp, while an explicit `end` bounds either start source. `watch_batch` accepts the same optional `start` / `end` pair as shared bounds for every item. The router normally selects the effective resolution from the question.

### Use `/watch`

`/watch` is a thin UX wrapper that asks the agent to invoke the real tool, preserving the tier-3 image result path:

```text
/watch ./demo.mp4 What text appears at the end?
/watch https://www.youtube.com/watch?v=jNQXAC9IVRw What does the speaker say?
```

If Pi reports that `watch` is unavailable, confirm the package with `pi list`, enable the extension with `pi config`, check any tool allowlist/loadout, and run `/reload` or restart Pi.

Tool-result details report the effective absolute `range`, fixed-size `availableEvidence`, post-bound `returnedEvidence`, and truncation flags. Coverage contains only counts and first/last offsets; it never embeds refs, questions, transcript text, stderr, credentials, environment values, or model/cache paths. Available evidence is measured after range filtering, while returned evidence counts only transcript segments and complete frame-label/image pairs that survive the final output limits.

## Optional local speech transcription

Local ASR is disabled by default. Install and manage `mlx-whisper` yourself, then opt in exactly:

```bash
uv tool install mlx-whisper
export WATCH_ASR_LOCAL=1
```

A bounded explicit configuration is:

```bash
export WATCH_ASR_LOCAL=1
export WATCH_ASR_EXECUTABLE="mlx_whisper"
export WATCH_ASR_MODEL="mlx-community/whisper-tiny"
export WATCH_ASR_MAX_DURATION_MS=60000
export WATCH_ASR_TIMEOUT_MS=300000
```

Local ASR runs only for spoken-intent questions after captions are unavailable. It receives one resolved local media path, validates English timestamped JSON, and either supplies tier 1 or returns transcript source `none` so tiers 2 and 3 remain available. Visual questions and caption-backed spoken questions do not invoke it.

Failures appear as private typed diagnostics: `duration-limit`, `missing-executable`, `timeout`, `process-error`, `invalid-output`, or `cleanup-error`. See [Local speech transcription setup](docs/LOCAL-ASR-SETUP.md) for defaults and ceilings, every remediation, single/batch diagnostic locations, package/model-cache expectations, ownership/privacy details, and deterministic/live proof commands.

## How YouTube watching works

For a supported YouTube URL, `pi-watch`:

1. Canonicalizes the URL while retaining the caller's original reference and any valid start-only timestamp metadata.
2. Runs one bounded, configuration-isolated `yt-dlp` media download in resolver-owned temporary storage.
3. Uses `ffprobe` to resolve the effective absolute half-open range. Explicit bounds take precedence; an end beyond the source is clamped, while invalid explicit bounds or a start at/after duration fail before scene/frame work.
4. Runs the existing full-source scene analysis, selects cuts/backfill against range-relative duration, then decodes only budgeted absolute offsets inside the range. Phase 21 does not yet avoid scene analysis or decoding based on route choice.
5. Requests human captions first and makes one automatic-caption fallback attempt; eligible local ASR remains captions-first and bounded.
6. Clips intersecting caption or ASR cues only at range boundaries while preserving text, source, stable order, and absolute offsets. An empty in-range transcript records source `none` and preserves visual fallback.
7. Routes usable range-filtered transcript evidence to tier 1, otherwise continuing through optional tier 2 and universal tier 3.
8. Removes only resolver-, caption-, and adapter-owned temporary storage after success or failure. Local caller files and user-owned package/model caches are never deleted.

Caption availability is not guaranteed. Missing or malformed captions and every local-ASR failure do not fabricate speech or block visual analysis.

## Optional local tier 2

Tier 2 is optional. The default configuration makes no tier-2 network request. To opt into the documented local Apple Silicon setup:

```bash
export WATCH_TIER2_LOCAL=1
```

Or provide an OpenAI-compatible endpoint explicitly:

```bash
export WATCH_TIER2_BASE_URL="http://localhost:8080/v1"
export WATCH_TIER2_MODEL="mlx-community/Qwen3-VL-8B-Instruct-4bit"
```

See [Tier 2 local model setup](docs/TIER2-SETUP.md) for the verified `mlx_vlm.server` workflow, diagnostics, and timeout configuration. No Gemini or other cloud provider is mandatory.

## Development and proof

Install dependencies and run the offline quality gates:

```bash
npm install
npm test
npm run typecheck
npm run build
```

Run the deterministic local-speech compiled-registration proof:

```bash
npm run build
npm test -- test/watch/asr-e2e.test.ts
```

It validates the committed synthetic English fixture and registered `dist/watch/extension.js` path, proves private `missing-executable` fallback to tier 3, and skips real model work. After intentionally supplying the user-managed prerequisites, the finite optional live proof is:

```bash
WATCH_ASR_LIVE=1 \
npm test -- test/watch/asr-e2e.test.ts -t "\[phase19\]\[AC-3\]"
```

Run the focused YouTube test in default-safe mode:

```bash
npm test -- test/watch/youtube.live.test.ts
```

It is skipped unless explicitly enabled. A real public-YouTube run is:

```bash
WATCH_YOUTUBE_LIVE=1 npm test -- test/watch/youtube.live.test.ts
```

Public YouTube behavior and the default fixture can change independently of this code. Override its supported URL and finite timeout when necessary; see [YouTube setup](docs/YOUTUBE-SETUP.md). The live test does not use cookies, browser profiles, credentials, or private videos.

## Scope and documentation

- [Local speech transcription setup and diagnostics](docs/LOCAL-ASR-SETUP.md)
- [YouTube setup and troubleshooting](docs/YOUTUBE-SETUP.md)
- [Optional tier-2 setup](docs/TIER2-SETUP.md)
- [High-level design and verified architecture](DESIGN.md)

Not included in v0.4: playlists, channels, embed URLs, private/authenticated videos, arbitrary remote-video hosts, guaranteed captions, hidden ASR installation, bundled Python/model runtimes, multilingual guarantees, translation, diarization, subtitle export, streaming/live video, long-media chunking, accuracy/performance guarantees, or mandatory cloud services.