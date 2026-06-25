# Tier 2 local model setup

This runbook stands up the local tier-2 vision endpoint used by `pi-watch`: `mlx_vlm.server` serving Qwen3-VL through an OpenAI-compatible `/v1/chat/completions` API.

The `watch` tool does not fork code per model. It only needs:

```sh
export WATCH_TIER2_BASE_URL="http://localhost:8080/v1"
export WATCH_TIER2_MODEL="mlx-community/Qwen3-VL-8B-Instruct-4bit"
```

`WATCH_TIER2_API_KEY` is not needed for the local `mlx_vlm.server`.

## Zero-config local default (opt-in)

If you run the standard local `mlx_vlm.server` on the documented host/port, you can skip the two `export`s above and instead opt in with a single flag:

```sh
export WATCH_TIER2_LOCAL=1
```

When `WATCH_TIER2_LOCAL` is exactly `1` **and** neither `WATCH_TIER2_BASE_URL` nor `WATCH_TIER2_MODEL` is set, `pi-watch` auto-points tier 2 at the documented local endpoint:

- `baseURL` = `http://localhost:8080/v1`
- `model` = `mlx-community/Qwen3-VL-8B-Instruct-4bit`

Precedence and safety:

- **Explicit wins:** if you set `WATCH_TIER2_BASE_URL` + `WATCH_TIER2_MODEL`, those always override the local default (use them for a different port, host, or model).
- **Default stays network-free:** with the flag unset (or any value other than `1`), tier 2 resolves to *unconfigured* and never contacts localhost — exactly the Phase-12 behavior.
- **Server must be up:** with the flag on but no server running, tier 2 will report `network-error` (not `unconfigured`) and escalate to tier 3, since `pi-watch` does attempt the local endpoint.

## Verified setup

Verified on this machine:

- Apple Silicon Mac: M4 Pro, 48 GB unified memory
- Python environment: CPython 3.12.12, pinned with `uv`
- `mlx-vlm`: 0.6.3
- Model: `mlx-community/Qwen3-VL-8B-Instruct-4bit`
- Model weight download: about 5.38 GiB
- Server URL: `http://localhost:8080/v1`

The larger candidate, `mlx-community/Qwen3-VL-30B-A3B-Instruct-4bit`, was also verified to exist but is about 17.01 GiB of weights. The smaller 8B 4-bit model was chosen first for fastest green / lowest local risk.

## Prerequisites

Install or confirm these tools are available:

```sh
uv --version
ffmpeg -version
```

Do not use the system Python if it is too new for `mlx_vlm` wheels. This Mac's system Python was 3.14.6, so the environment below pins Python 3.12 with `uv`.

## Create the Python environment

The environment used for this run was placed outside the repository so it cannot be accidentally committed:

```sh
uv venv --python 3.12 /Users/maxwellnewman/pi/workspace/pi-watch-mlx-venv
uv pip install --python /Users/maxwellnewman/pi/workspace/pi-watch-mlx-venv mlx-vlm
```

Verify the import:

```sh
/Users/maxwellnewman/pi/workspace/pi-watch-mlx-venv/bin/python -c "import mlx_vlm; print(mlx_vlm.__version__)"
```

Expected result from this run:

```text
0.6.3
```

## Start the server

Start `mlx_vlm.server` on port 8080:

```sh
/Users/maxwellnewman/pi/workspace/pi-watch-mlx-venv/bin/python -m mlx_vlm.server \
  --model mlx-community/Qwen3-VL-8B-Instruct-4bit \
  --port 8080
```

The installed server supports these relevant flags:

```sh
/Users/maxwellnewman/pi/workspace/pi-watch-mlx-venv/bin/python -m mlx_vlm.server --help
```

In this run, the server logged:

```text
Loading model from: mlx-community/Qwen3-VL-8B-Instruct-4bit
Model ready, continuous batching enabled.
Application startup complete.
Uvicorn running on http://0.0.0.0:8080
```

Use this base URL for `pi-watch` configuration:

```sh
export WATCH_TIER2_BASE_URL="http://localhost:8080/v1"
export WATCH_TIER2_MODEL="mlx-community/Qwen3-VL-8B-Instruct-4bit"
```

`src/watch/tier2.ts` requires both `WATCH_TIER2_BASE_URL` and `WATCH_TIER2_MODEL`. The base URL must include `/v1`; the adapter appends `/chat/completions` itself.

## Smoke test the OpenAI wire shape

This smoke test sends the same shape that `buildTier2Request` emits: a chat-completions request with one `user` message whose `content` array contains text plus base64 `image_url` parts.

Generate a tiny red PNG frame:

```sh
ffmpeg -y -f lavfi -i color=c=red:s=64x64:d=1 -frames:v 1 /tmp/pi-watch-red.png
```

POST it to the local endpoint:

```sh
python3 - <<'PY'
import base64, json, urllib.request

img = base64.b64encode(open('/tmp/pi-watch-red.png', 'rb').read()).decode('ascii')
body = {
    'model': 'mlx-community/Qwen3-VL-8B-Instruct-4bit',
    'temperature': 0,
    'messages': [
        {
            'role': 'user',
            'content': [
                {
                    'type': 'text',
                    'text': 'Question: What color is the frame? Answer briefly. The video sampled frames are provided below in timeline order.',
                },
                {
                    'type': 'image_url',
                    'image_url': {'url': 'data:image/png;base64,' + img},
                },
                {'type': 'text', 'text': '00:00'},
            ],
        }
    ],
}

req = urllib.request.Request(
    'http://localhost:8080/v1/chat/completions',
    data=json.dumps(body).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='POST',
)

with urllib.request.urlopen(req, timeout=180) as res:
    data = json.loads(res.read().decode('utf-8'))
    print('HTTP', res.status)
    print('CONTENT', data['choices'][0]['message']['content'])
PY
```

Successful result from this run:

```text
HTTP 200
CONTENT red
```

That non-empty `choices[0].message.content` value is accepted by `parseTier2Answer`.

## Configure pi-watch

Before running `watch` / `/watch` with tier 2 enabled, export:

```sh
export WATCH_TIER2_BASE_URL="http://localhost:8080/v1"
export WATCH_TIER2_MODEL="mlx-community/Qwen3-VL-8B-Instruct-4bit"
```

Leave `WATCH_TIER2_API_KEY` unset for the local server.

## Run the opt-in live adapter proof

The repository includes a live Vitest proof that sends the actual `buildTier2Request` output to the running tier-2 endpoint and parses the real response with `parseTier2Answer`.

Default `npm test` skips this proof. It does not require `mlx_vlm.server` or network access unless explicitly enabled.

With the server running, execute:

```sh
WATCH_TIER2_LIVE=1 \
WATCH_TIER2_BASE_URL="http://localhost:8080/v1" \
WATCH_TIER2_MODEL="mlx-community/Qwen3-VL-8B-Instruct-4bit" \
npm test -- test/watch/tier2.live.test.ts
```

The test builds a one-frame red `WatchedFrameSet`, posts the OpenAI-compatible `content[]` shape to `/chat/completions`, and expects a non-empty answer mentioning `red`.

Local `mlx_vlm.server` does not need `WATCH_TIER2_API_KEY`. Hosted OpenAI-compatible endpoints may require it.

## Reading tier-2 failures

Tier 2 never blocks an answer. When it cannot answer, `watch` **silently escalates to tier 3** (frames-into-context) and still returns a result — so a watch can quietly fall back to frames without any obvious error. To make that legible, the tool now records a structured `details.tier2` diagnostic whenever tier 2 was attempted but did not answer.

The diagnostic appears on the `watch` tool result's `details` (and on each `watch_batch` item's `details`). It is present only when tier 3 (or tier 1) ended up answering; a successful tier-2 answer records **no** `details.tier2`.

**Human-facing hint (single-video `watch`):** when tier 2 was *unconfigured* and another tier answered, the single-video `watch` result also appends a short guidance line to its content:

> Tier 2 (native video understanding) is unconfigured — set `WATCH_TIER2_BASE_URL` and `WATCH_TIER2_MODEL` to enable it (or `WATCH_TIER2_LOCAL=1` to use a local mlx_vlm server). See docs/TIER2-SETUP.md.

This nudge is shown **only** for the `unconfigured` reason (not for `http-error` / `empty-answer` / `timeout` / `network-error`, which mean tier 2 *was* configured) and **only** when tier 2 did not itself answer. `watch_batch` keeps its structured per-item `details.tier2` and does not add this line to its aggregated content.

Shape:

```jsonc
"details": {
  "tier": 3,                // the tier that actually answered
  "tier2": { "reason": "http-error", "httpStatus": 500 }
}
```

`reason` is one of:

| `reason` | Meaning | Network call? |
|----------|---------|---------------|
| `unconfigured` | `WATCH_TIER2_BASE_URL` and/or `WATCH_TIER2_MODEL` are unset, so tier 2 is disabled. | No — emitted before any request. |
| `http-error` | The endpoint replied with a non-2xx status. The numeric status is in `httpStatus` (e.g. `500`). | Yes. |
| `empty-answer` | The endpoint replied 2xx but the answer was empty, garbled, or unparseable. | Yes. |
| `timeout` | The request exceeded `WATCH_TIER2_TIMEOUT_MS` and was aborted. | Yes (aborted). |
| `network-error` | The endpoint could not be reached (connection refused, DNS, etc.). A short, non-secret `message` is included. | Attempted. |

Mapping to the Troubleshooting bullets below:

- `unconfigured` → "unset env": export `WATCH_TIER2_BASE_URL` and `WATCH_TIER2_MODEL` (see Configure pi-watch).
- `http-error` → server-side failure: check the `mlx_vlm.server` logs for the reported status.
- `empty-answer` → "Empty or malformed response": confirm the request shape (image_url blocks, not a raw video).
- `timeout` → "Slow first startup": the first run may be loading multi-GB weights; raise `WATCH_TIER2_TIMEOUT_MS` or warm the model first.
- `network-error` → "Port already in use" / server not running: confirm the server is up and `WATCH_TIER2_BASE_URL` points at the right host/port (including `/v1`).

Diagnostics are deliberately **secret-free**: a `details.tier2` value never contains the api key, the `Authorization` header, or the request body — only the `reason`, the numeric `httpStatus` (for `http-error`), and a short error `message` (for `network-error`).

## Troubleshooting

- Python or wheel resolution errors: recreate the environment with `uv venv --python 3.12 ...` or `uv venv --python 3.11 ...`; do not use Python 3.14.
- Port already in use: choose another port with `--port <port>` and update `WATCH_TIER2_BASE_URL` accordingly, including `/v1`.
- Model not found: verify the Hugging Face repo id exactly: `mlx-community/Qwen3-VL-8B-Instruct-4bit`.
- Slow first startup: the first run may download multi-GB model weights into the Hugging Face cache.
- Empty or malformed response: confirm the request uses `messages[0].content` as an array with `{type:"image_url", image_url:{url:"data:image/png;base64,..."}}` blocks and not a raw video file.
- Local API key confusion: local `mlx_vlm.server` does not require `WATCH_TIER2_API_KEY`; hosted OpenAI-compatible endpoints may.
