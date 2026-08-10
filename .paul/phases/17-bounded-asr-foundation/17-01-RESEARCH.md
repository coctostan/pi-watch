# Phase 17 Plan 01 — Bounded Local ASR Research

**Host:** Apple Silicon (`arm64`), macOS 26.6
**Research date:** 2026-08-09
**Production files changed:** none

## Evidence protocol

- All process launches used argv arrays with no shell interpolation of media references.
- Every subprocess had a finite timeout and a 16 MiB captured-output ceiling.
- Package, model, audio, and output data lived under plan-created OS temporary directories.
- The probes uploaded no media, used no credentials, added no repository/global dependency, and removed all plan-created storage.
- Host capability baseline: `uv 0.9.27`, `uvx 0.9.27`, `ffmpeg 8.1.2`, `ffprobe 8.1.2`, and macOS `/usr/bin/say` were available; a global `mlx_whisper` executable was absent.

## AC-1 Runtime contract evidence

- Package version: `mlx-whisper 0.4.3`, resolved with `uv run --no-project --with mlx-whisper python -c "import importlib.metadata as m; print(m.version('mlx-whisper'))"` inside a temporary `UV_CACHE_DIR`.
- Executable: the distribution exposes the console script `mlx_whisper`; the bounded probe invoked it as `uvx --from mlx-whisper mlx_whisper` without a global install.
- Successful argv: observed transcription used `[
  "uvx", "--from", "mlx-whisper", "mlx_whisper", "<task-temp>/fixture.wav",
  "--model", "mlx-community/whisper-tiny", "--language", "en", "--task", "transcribe",
  "--output-name", "transcript", "--output-format", "json", "--verbose", "False",
  "--output-dir", "<task-temp>/cold"
]`; only the removed task-temporary root is normalized here.
- Timestamped output schema: `--output-format json` writes `<output-dir>/<output-name>.json`. The observed top-level keys were `text`, `segments`, and `language`. Every segment carried `id`, `seek`, `start`, `end`, `text`, `tokens`, `temperature`, `avg_logprob`, `compression_ratio`, and `no_speech_prob`; `start`/`end` are numeric seconds.
- Failure behavior: `uvx --from mlx-whisper mlx_whisper --definitely-invalid` exited `2` with argparse usage on stderr. Directly spawning the absent global `mlx_whisper` returned `status: null`, `signal: null`, and `errorCode: ENOENT`. A production adapter can distinguish missing executable, timeout, non-zero exit, oversized output, malformed JSON, and invalid timestamps without parsing human progress text.
- Cache/install ownership: the package-only temporary uv cache reached 2,094,395,392 bytes (35 packages, including MLX/Torch transitive runtime data) and was removed (`TASK1_TEMP_REMOVED=true`). `uvx` owns package-cache population; Hugging Face owns model-cache population. Production must treat user-configured package/model caches as user-owned and remove only its own temporary output directory.

### CLI options relevant to the implementation contract

| Concern | Observed option | Selected use |
|---|---|---|
| Input | positional `audio [audio ...]` | Pass exactly one resolved local `mediaRef` |
| Model | `--model MODEL` | Configurable; measured candidate is `mlx-community/whisper-tiny` |
| Language | `--language` | Explicit `en` for the English-first milestone |
| Task | `--task {transcribe,translate}` | Fixed to `transcribe` |
| Output directory | `--output-dir` / `-o` | Plan-/adapter-owned temporary directory |
| Output name | `--output-name` | Fixed deterministic basename `transcript` |
| Output format | `--output-format json` / `-f json` | Stable machine-readable timestamped artifact |
| Progress | `--verbose False` | Keeps stdout empty; progress may still appear on bounded stderr |
| Word timestamps | `--word-timestamps` | Not required; segment timestamps already satisfy the shared timeline |

### Contract conclusion

The public console script provides the required machine-readable timestamped contract. The implementation should use the executable boundary rather than an embedded Python API: invoke one argv-only process, read a bounded JSON file from adapter-owned storage, validate segment timestamps, and degrade on every error. No blocking CLI-contract finding remains.
