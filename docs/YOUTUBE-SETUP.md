# YouTube setup and troubleshooting

`pi-watch` supports a deliberately narrow YouTube-first URL surface. A supported URL is resolved with the system `yt-dlp`, sampled with `ffprobe` and `ffmpeg`, and routed through the same `watch` tool used for local files.

YouTube access is optional. The default test suite remains offline, and local-file watching does not invoke `yt-dlp` or the network.

## Prerequisites

- Node.js 20 or newer.
- Pi with the `pi-watch` package installed and enabled.
- Current `yt-dlp`, `ffmpeg`, and `ffprobe` executables on `PATH`.
- Network access to the selected public YouTube video.

Check the installed tools:

```bash
node --version
yt-dlp --version
ffmpeg -version
ffprobe -version
```

Install or update these tools through the package manager appropriate for your operating system. If YouTube reports extraction or format errors, update `yt-dlp` before changing `pi-watch`; YouTube regularly changes behavior independently of this repository.

## Supported URL forms

The video ID must be exactly 11 characters using YouTube's ID character set. These forms are supported:

```text
https://www.youtube.com/watch?v=<11-char-id>
https://youtu.be/<11-char-id>
https://www.youtube.com/shorts/<11-char-id>
```

Examples:

```text
https://www.youtube.com/watch?v=jNQXAC9IVRw
https://youtu.be/jNQXAC9IVRw
https://www.youtube.com/shorts/jNQXAC9IVRw
```

Both `http` and `https` are parsed, but the resolver canonicalizes supported inputs to an HTTPS `youtube.com/watch` URL for `yt-dlp`. The original caller-provided reference remains in the resulting frame-set metadata and tool errors.

### Outside v0.3 scope

The following are rejected or unsupported:

- Playlists and playlist-only URLs.
- Channel, user, and search pages.
- YouTube embed URLs.
- Mobile or alternate YouTube hosts not listed above.
- Non-YouTube remote video URLs.
- Private, age-gated, members-only, or otherwise authenticated videos.
- Cookies, browser-profile extraction, and credential-based access.
- Whisper/local ASR.
- Guaranteed caption availability.

A `watch?v=` URL must contain one valid `v` value. User information, custom ports, malformed URLs, and IDs that are not exactly 11 valid characters are rejected before any download.

## Install the Pi package

Before the `v0.3.0` Git tag exists, clone the repository and install its local path:

```bash
git clone https://github.com/coctostan/pi-watch.git
pi install ./pi-watch
pi list
```

After the `v0.3.0` tag is published, the pinned Git-package command is:

```bash
pi install git:github.com/coctostan/pi-watch@v0.3.0
```

Do not use `pi install npm:pi-watch`. That unscoped npm name resolves to an unrelated registry package. A scoped npm rename/publication is not part of v0.3.

The repository includes the compiled `dist/watch/extension.js` referenced by its Pi package manifest. This is necessary because Pi's default Git-package dependency install omits development dependencies and therefore cannot compile the TypeScript source during installation.

If needed, run `pi config` to enable the extension, then restart Pi or run `/reload`.

## Use a YouTube URL

Ask the agent to invoke the tool:

```text
Use the watch tool with ref "https://youtu.be/jNQXAC9IVRw" and question "What does the speaker say?"
```

Or use the convenience command:

```text
/watch https://www.youtube.com/watch?v=jNQXAC9IVRw What does the speaker say?
```

`/watch` sends a steering prompt to the agent so the real `watch` tool performs the work. This preserves tier 3, where sampled images must return to the orchestrator as tool-result image content.

## What happens during a watch

1. The source classifier validates and canonicalizes the URL while retaining the caller's original reference.
2. The resolver creates owned temporary storage and performs one bounded `yt-dlp` media download with `--ignore-config` and `--no-playlist`.
3. `ffprobe` reads duration; `ffmpeg` detects scene changes and decodes only budget-selected frame times.
4. Caption lookup uses the original YouTube reference. It requests human captions first and makes at most one automatic-caption fallback attempt using subtitle-only `yt-dlp` operations.
5. Valid WebVTT cues join the shared frame/transcript timeline with transcript source `captions`.
6. Any caption absence, parse failure, process error, unsafe path, oversized file, or cleanup problem degrades caption output to transcript source `none`; it does not invent spoken content.
7. Spoken questions with captions can finish at tier 1. Without usable captions, the existing visual route continues through optional tier 2 and universal tier 3.
8. Resolver- and caption-owned temporary directories are removed after success or failure. Caller-owned local files are never removed.

The media download and caption lookup are separate bounded `yt-dlp` operations: the resolver downloads media once, while caption acquisition uses `--skip-download` and never re-downloads the video.

## Caption and visual fallback behavior

Captions are best effort, not a prerequisite for watching:

- Human captions are preferred.
- One automatic-caption attempt is allowed when human captions are absent or unusable.
- Failure becomes transcript source `none`.
- Tier 2 remains optional.
- Tier 3 returns sampled frames to the orchestrator and is the universal visual fallback.

Whisper/local ASR is not included in v0.3. If a question requires exact speech and the video has no usable captions, the visual tiers may not be able to recover the words.

## Optional tier 2

Without tier-2 configuration, no tier-2 network request occurs. The tool records an `unconfigured` diagnostic and escalates safely.

For the documented local endpoint, set:

```bash
export WATCH_TIER2_LOCAL=1
```

For a custom OpenAI-compatible endpoint, set both:

```bash
export WATCH_TIER2_BASE_URL="http://localhost:8080/v1"
export WATCH_TIER2_MODEL="mlx-community/Qwen3-VL-8B-Instruct-4bit"
```

See [Tier 2 local model setup](TIER2-SETUP.md) for the verified `mlx_vlm.server` workflow and diagnostic meanings. Tier 2 and cloud API keys are never required for YouTube resolution or tier-3 fallback.

## Live smoke test

### Default-safe mode

This command defines the live test but skips it before extension registration or any media/network work:

```bash
npm test -- test/watch/youtube.live.test.ts
```

Expected summary:

```text
Test Files  1 skipped
Tests       1 skipped
```

### Opt-in public YouTube run

Run the actual registered `watch` tool through source resolution, sampling, routing, and tier execution:

```bash
WATCH_YOUTUBE_LIVE=1 npm test -- test/watch/youtube.live.test.ts
```

The configured default fixture is:

```text
https://www.youtube.com/watch?v=BaW_jenozKc
```

Public fixtures can be removed, geo-blocked, throttled, or changed independently of `pi-watch`. If the default fixture is unavailable, supply another supported public URL explicitly:

```bash
WATCH_YOUTUBE_LIVE=1 \
WATCH_YOUTUBE_URL="https://www.youtube.com/watch?v=jNQXAC9IVRw" \
npm test -- test/watch/youtube.live.test.ts
```

Override the finite timeout when a slow network or media tool needs more time:

```bash
WATCH_YOUTUBE_LIVE=1 \
WATCH_YOUTUBE_URL="https://www.youtube.com/watch?v=jNQXAC9IVRw" \
WATCH_YOUTUBE_LIVE_TIMEOUT_MS=240000 \
npm test -- test/watch/youtube.live.test.ts
```

The smoke forces tier 2 unconfigured and uses a one-frame budget. It passes when the tool returns sampled frames and finishes at caption-backed tier 1 or visual tier 3.

## Troubleshooting

### Unsupported or malformed URL

Symptoms include `Unsupported YouTube source URL`, an unsupported host, or an invalid video ID.

- Use exactly one of the three supported forms.
- Confirm the ID is exactly 11 characters.
- Remove playlist-only, channel, embed, authentication, custom-port, or unrelated-host syntax.
- Do not add cookies or browser-profile flags; authenticated video support is outside scope.

### `yt-dlp` not found

```bash
yt-dlp --version
```

If the shell cannot find it, install `yt-dlp` and ensure its directory is on the same `PATH` used to launch Pi. Restart Pi after changing `PATH`.

### Video unavailable, extraction failure, or non-zero download

- Open the public URL normally and confirm it remains available without authentication.
- Update `yt-dlp` through its installation method.
- Retry with another explicitly public supported URL.
- Check network, DNS, proxy, geographic, and rate-limit conditions.
- Do not weaken production errors or add credentials to fixtures for a transient public-video failure.

### Download or live-test timeout

- Confirm the URL is a short, public video suitable for a smoke test.
- Check network throughput and free temporary-disk space.
- Increase `WATCH_YOUTUBE_LIVE_TIMEOUT_MS` for the test.
- Production resolver subprocesses remain separately bounded; a test timeout increase does not make them unbounded.

### `ffprobe` failure

```bash
ffprobe -version
```

A failure usually means `ffprobe` is missing from `PATH`, the downloaded media is unsupported/corrupt, or the process cannot read the temporary file. Install a complete ffmpeg distribution that includes `ffprobe`.

### `ffmpeg` sampling or decode failure

```bash
ffmpeg -version
```

Confirm a current ffmpeg build is available on `PATH`. Retry the public URL directly with current `yt-dlp`; unavailable formats and incomplete downloads can surface later as decode errors.

### Captions unavailable

This is not automatically an error. `pi-watch` tries human captions, then one automatic-caption fallback, then records transcript source `none` and continues visually.

- Ask a visual question when exact speech is unavailable.
- Configure optional tier 2 if additional visual reasoning is useful.
- Do not assume the video has captions just because YouTube can display generated text in another region or session.

### Tier 2 says `unconfigured`

This is the safe default, not a YouTube resolver failure. The tool proceeds to tier 3. Set `WATCH_TIER2_LOCAL=1` or both endpoint variables only if you want tier 2; see [TIER2-SETUP.md](TIER2-SETUP.md).

### Tool or `/watch` is unavailable

```bash
pi list
```

Then:

- Confirm the Git/local package source points to this repository, not `npm:pi-watch`.
- Use `pi config` to enable the extension.
- Run `/reload` or restart Pi.
- Check `--tools`, `--exclude-tools`, and any external tool governor/loadout for a `watch` allowlist entry.
- Confirm `dist/watch/extension.js` exists in the installed Git clone.

### Temporary files or cleanup errors

`pi-watch` removes only directories it created for resolver media and captions. It never deletes caller-owned local video paths. A cleanup failure remains visible rather than silently hiding a primary sampling failure. Do not point cleanup troubleshooting at unrelated user files, cookies, or browser data; those are never part of the supported flow.
