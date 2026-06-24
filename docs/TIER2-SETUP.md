# Tier 2 local model setup

This runbook stands up the local tier-2 vision endpoint used by `pi-watch`: `mlx_vlm.server` serving Qwen3-VL through an OpenAI-compatible `/v1/chat/completions` API.

The `watch` tool does not fork code per model. It only needs:

```sh
export WATCH_TIER2_BASE_URL="http://localhost:8080/v1"
export WATCH_TIER2_MODEL="mlx-community/Qwen3-VL-8B-Instruct-4bit"
```

`WATCH_TIER2_API_KEY` is not needed for the local `mlx_vlm.server`.

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

## Troubleshooting

- Python or wheel resolution errors: recreate the environment with `uv venv --python 3.12 ...` or `uv venv --python 3.11 ...`; do not use Python 3.14.
- Port already in use: choose another port with `--port <port>` and update `WATCH_TIER2_BASE_URL` accordingly, including `/v1`.
- Model not found: verify the Hugging Face repo id exactly: `mlx-community/Qwen3-VL-8B-Instruct-4bit`.
- Slow first startup: the first run may download multi-GB model weights into the Hugging Face cache.
- Empty or malformed response: confirm the request uses `messages[0].content` as an array with `{type:"image_url", image_url:{url:"data:image/png;base64,..."}}` blocks and not a raw video file.
- Local API key confusion: local `mlx_vlm.server` does not require `WATCH_TIER2_API_KEY`; hosted OpenAI-compatible endpoints may.
