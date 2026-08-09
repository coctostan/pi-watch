# pi-watch

`pi-watch` gives a Pi agent a `watch` tool for answering questions about local videos and supported YouTube URLs using the cheapest available path that works.

It owns one budget-capped sampler and routes each question through three tiers:

| Tier | Path | Typical use |
|---|---|---|
| 1 | Caption transcript | Questions about what was said |
| 2 | OpenAI-compatible vision endpoint | Optional local or hosted visual reasoning |
| 3 | Sampled frames returned as Pi `ImageContent` | Universal visual fallback for the orchestrator |

Cloud access is not required. With tier 2 unconfigured, `pi-watch` stays local except when you explicitly provide a supported YouTube URL; it then uses the local `yt-dlp`, `ffprobe`, and `ffmpeg` executables.

## Features

- Real Pi `watch` tool plus a `/watch` convenience command.
- Local files and three supported YouTube URL forms.
- Scene-change sampling with gap backfill, frame budgets, and timestamps.
- Human YouTube captions first, with one automatic-caption fallback.
- Explicit tier escalation: transcript → optional vision endpoint → frames.
- Caller URL preservation and cleanup of resolver-owned temporary files.
- Default-off live tests, so the normal suite does not require YouTube or a model server.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer.
- [Pi](https://pi.dev/).
- `ffmpeg` and `ffprobe` on `PATH`.
- `yt-dlp` on `PATH` for YouTube URLs. Local-file watching does not require it.

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

This is the supported path before the `v0.3.0` release tag exists:

```bash
git clone https://github.com/coctostan/pi-watch.git
pi install ./pi-watch
pi list
```

A local-path Pi package points at the clone rather than copying it. Restart Pi or run `/reload` after rebuilding or updating the package. If the extension is installed but disabled, use `pi config` to enable it.

### Install the tagged Git release

After the repository publishes the `v0.3.0` tag, install that pinned release with:

```bash
pi install git:github.com/coctostan/pi-watch@v0.3.0
```

The command above is not usable until that tag exists. Before release, use the clone/local-path workflow. The repository commits its compiled `dist/` extension so Pi's default Git-package install can load `dist/watch/extension.js` without development-only build tooling.

> **Do not run `pi install npm:pi-watch`.** The unscoped npm package named `pi-watch` is an unrelated registry project. This repository is currently supported through its Git repository or a local clone; a scoped npm rename/publication is outside v0.3.

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
  "ref": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  "question": "What happens in the video?",
  "budget": 8,
  "resolution": "low"
}
```

`budget` and `resolution` are optional. The router normally selects the effective resolution from the question.

### Use `/watch`

`/watch` is a thin UX wrapper that asks the agent to invoke the real tool, preserving the tier-3 image result path:

```text
/watch ./demo.mp4 What text appears at the end?
/watch https://www.youtube.com/watch?v=jNQXAC9IVRw What does the speaker say?
```

If Pi reports that `watch` is unavailable, confirm the package with `pi list`, enable the extension with `pi config`, check any tool allowlist/loadout, and run `/reload` or restart Pi.

## How YouTube watching works

For a supported YouTube URL, `pi-watch`:

1. Canonicalizes the URL while retaining the caller's original reference.
2. Runs one bounded, configuration-isolated `yt-dlp` media download in resolver-owned temporary storage.
3. Uses `ffprobe` and `ffmpeg` to inspect the video and decode only the selected frame times.
4. Requests human captions first and makes one automatic-caption fallback attempt.
5. Routes caption-backed spoken questions to tier 1; caption failure becomes transcript source `none` and preserves visual fallback through tiers 2 and 3.
6. Removes only resolver- and caption-owned temporary storage after success or failure. Local caller files are never owned or deleted by the sampler.

Caption availability is not guaranteed. Missing, malformed, or unavailable captions do not fabricate speech and do not block visual analysis.

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

## Development

Install dependencies and run the offline quality gates:

```bash
npm install
npm test
npm run typecheck
npm run build
```

Run the focused YouTube test in default-safe mode:

```bash
npm test -- test/watch/youtube.live.test.ts
```

It is skipped unless explicitly enabled. A real public-YouTube run is:

```bash
WATCH_YOUTUBE_LIVE=1 npm test -- test/watch/youtube.live.test.ts
```

Public YouTube behavior and the default fixture can change independently of this code. Override the URL and timeout when necessary:

```bash
WATCH_YOUTUBE_LIVE=1 \
WATCH_YOUTUBE_URL="https://www.youtube.com/watch?v=jNQXAC9IVRw" \
WATCH_YOUTUBE_LIVE_TIMEOUT_MS=180000 \
npm test -- test/watch/youtube.live.test.ts
```

The live test requires working network access plus current `yt-dlp`, `ffmpeg`, and `ffprobe` installations. It does not use cookies, browser profiles, credentials, or private videos.

## Scope and documentation

- [YouTube setup and troubleshooting](docs/YOUTUBE-SETUP.md)
- [Optional tier-2 setup](docs/TIER2-SETUP.md)
- [High-level design and verified architecture](DESIGN.md)

Not included in v0.3: playlists, channels, embed URLs, private/authenticated videos, arbitrary remote-video hosts, Whisper/local ASR, guaranteed captions, or mandatory cloud services.
