# Local speech transcription setup

`pi-watch` can use a user-managed `mlx_whisper` executable as a best-effort tier-1 transcript source when captions are unavailable. This path is optional, English-first, and designed for short media on Apple Silicon Macs.

Local ASR is disabled unless `WATCH_ASR_LOCAL` is exactly `1`. A normal watch never installs Python packages, downloads a model, or starts a transcription process on its own.

## Supported path and prerequisites

The verified path uses:

- Apple Silicon macOS.
- Node.js 20 or newer, Pi, `ffmpeg`, and `ffprobe` as described in the [README](../README.md).
- The `mlx-whisper` package's `mlx_whisper` console executable.
- The default `mlx-community/whisper-tiny` English model.

The Phase 17 spike used `mlx-whisper` 0.4.3. Its package environment populated about 2.09 GB of package cache, while the measured tiny-model cache delta was about 89 MB. Versions and cache sizes can change. First use may need network access to install the package and fetch model weights; subsequent use can use the user's existing caches.

This is a known local English path, not a multilingual guarantee, accuracy benchmark, performance benchmark, or long-media transcription service.

## Install the user-managed executable

[`uv`](https://docs.astral.sh/uv/) provides one explicit installation path:

```bash
uv --version
uv tool install mlx-whisper
mlx_whisper --help
```

If `uv` reports that the tool is already installed, use its normal upgrade/reinstall commands deliberately rather than letting a watch request change the environment.

A compatible direct executable is also supported. Confirm it runs, then set `WATCH_ASR_EXECUTABLE` to its command name or absolute path. `pi-watch` invokes it directly with an argv array; it does not use a shell or interpolate the media reference into a command string.

## Enable local ASR

The smallest configuration is:

```bash
export WATCH_ASR_LOCAL=1
```

Built-in defaults:

| Setting | Default | Absolute ceiling | Purpose |
|---|---:|---:|---|
| `WATCH_ASR_EXECUTABLE` | `mlx_whisper` | — | User-managed compatible executable |
| `WATCH_ASR_MODEL` | `mlx-community/whisper-tiny` | — | Model identifier passed to the executable |
| `WATCH_ASR_MAX_DURATION_MS` | `600000` | `600000` | Reject media longer than the configured duration before spawning ASR |
| `WATCH_ASR_TIMEOUT_MS` | `300000` | `600000` | Bound the transcription process |

For a shorter, explicitly bounded setup:

```bash
export WATCH_ASR_LOCAL=1
export WATCH_ASR_EXECUTABLE="mlx_whisper"
export WATCH_ASR_MODEL="mlx-community/whisper-tiny"
export WATCH_ASR_MAX_DURATION_MS=60000
export WATCH_ASR_TIMEOUT_MS=300000
```

Positive duration and timeout values are clamped to their 600,000 ms ceilings. Empty, non-numeric, or non-positive values fall back to defaults. The captured process output and JSON file are separately limited to 16 MiB and that ceiling is not configurable.

Changing any `WATCH_ASR_*` variable does **not** enable transcription unless `WATCH_ASR_LOCAL=1` is also set.

## When transcription runs

For each `watch` or bounded `watch_batch` item, `pi-watch`:

1. Resolves and samples the media so visual fallback is already available.
2. Requests captions first.
3. Considers local ASR only when captions produced no transcript, local ASR is explicitly enabled, and the question is classified as spoken intent.
4. Runs one finite `mlx_whisper` process against the resolved media.
5. Validates non-empty English timestamped JSON segments on the media timeline.
6. Uses a valid transcript at tier 1; every ASR failure returns transcript source `none` and preserves tiers 2 and 3.

Visual or on-screen-text questions do not start local ASR. Captions suppress local ASR. Existing watch-batch item limits still apply; enabling ASR does not add a new unbounded fan-out mechanism.

## Diagnostics and remediation

A failed eligible single-video attempt appears at `details.asr`. Batch diagnostics appear at `details.asr` as indexed entries shaped like `{ index, diagnostic }`, so each reason remains associated with its input item.

| `reason` | Meaning | Remediation |
|---|---|---|
| `duration-limit` | Media duration exceeded the active limit. The diagnostic includes numeric `durationMs` and `limitMs`. | Use shorter media or raise `WATCH_ASR_MAX_DURATION_MS` within the 600,000 ms ceiling. Long-media chunking is unsupported. |
| `missing-executable` | The configured executable could not be found. | Run `mlx_whisper --help`, check the `PATH` inherited by Pi, or set `WATCH_ASR_EXECUTABLE` to a compatible absolute executable path. |
| `timeout` | The process exceeded `WATCH_ASR_TIMEOUT_MS` and was terminated. | Confirm the model is installed/warmed, use short media, or raise the timeout within the 600,000 ms ceiling. |
| `process-error` | The executable started but failed before producing accepted output. | Run the executable directly with a non-private test file, verify model access and free disk space, and inspect its terminal output outside `pi-watch`. |
| `invalid-output` | Output was missing, oversized, malformed, empty, or contained no valid timestamped segment. Setup/read failures also use this reason. | Confirm a compatible `mlx_whisper` version and JSON output support; retry the synthetic proof below. |
| `cleanup-error` | Removing the adapter-created temporary JSON output directory failed. The transcript is discarded. | Check temporary-directory permissions and free space. Do not delete package/model caches as a watch cleanup step. |

Diagnostics are intentionally private and bounded. They do not contain the media ref, transcript text, subprocess stdout/stderr, executable value, model or cache path, credentials, or environment values. Except for `duration-limit`'s `durationMs` and `limitMs`, the diagnostic contains only its typed reason.

An ASR diagnostic does not mean the entire watch failed. Check `details.tier`: tier 3 can still return sampled frames, and configured tier 2 may still answer visually.

## Ownership, privacy, and network behavior

- A caller-provided local media file is borrowed. The ASR adapter reads it and never deletes it.
- Local media is not uploaded by the ASR adapter. `mlx_whisper` runs as a local process.
- A supported YouTube watch may already have resolver-downloaded media in sampler-owned temporary storage before ASR becomes eligible. See [YouTube setup](YOUTUBE-SETUP.md) for that separate network and ownership path.
- The adapter creates only a `pi-watch-asr-*` OS temporary directory for `transcript.json` and removes only that directory.
- The executable installation, Python environment, package cache, and model cache are user-owned. A watch request never installs, upgrades, mutates, or deletes them.
- First package/model setup may contact package and model hosts. This is distinct from uploading media and must be initiated and managed by the user.
- No general confidentiality or zero-local-processing claim is implied. Review third-party executable and model behavior before using sensitive media.

## Deterministic compiled-registration proof

The repository commits a 9.149-second synthetic MP4 containing this phrase:

> This is a deterministic English speech fixture for pi watch. The quick brown fox jumps over the lazy dog. Local transcription should preserve useful words and timestamps.

The default proof builds the package and imports the extension path declared by `package.json`. It validates the fixture and then selects a guaranteed-missing executable to prove private `missing-executable` diagnostics and tier-3 frames without model or network work:

```bash
npm run build
npm test -- test/watch/asr-e2e.test.ts
```

The real-model case is visible as skipped unless the exact live flag is supplied.

## Optional bounded live proof

After intentionally installing the executable and allowing model access, run:

```bash
WATCH_ASR_LIVE=1 \
npm test -- test/watch/asr-e2e.test.ts -t "\[phase19\]\[AC-3\]"
```

Optional supported overrides use the same production configuration:

```bash
WATCH_ASR_LIVE=1 \
WATCH_ASR_EXECUTABLE="mlx_whisper" \
WATCH_ASR_MODEL="mlx-community/whisper-tiny" \
WATCH_ASR_MAX_DURATION_MS=15000 \
WATCH_ASR_TIMEOUT_MS=300000 \
npm test -- test/watch/asr-e2e.test.ts -t "\[phase19\]\[AC-3\]"
```

The test itself has a finite 600,000 ms ceiling. A pass requires the compiled registered `watch` tool to return tier 1, transcript source `whisper`, ordered in-range timestamped segments, and all declared evidence words. Missing prerequisites fail with a pointer back to this runbook; they never trigger automatic installation.

This live test proves the executable/output integration against one known synthetic sample. It does not measure general speech accuracy, latency, throughput, memory use, or model quality.

## Package installation

For the current checkout, use the Git/local package workflow in the [README](../README.md). The repository commits `dist/watch/extension.js`, which is the path declared by `package.json` and included in the v0.4.0 package dry run.

Do not install `npm:pi-watch`; that unscoped registry package is unrelated. A tagged `v0.4.0` Git install should be used only after that tag has actually been published.
