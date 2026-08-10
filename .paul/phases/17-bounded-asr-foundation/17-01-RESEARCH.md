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


## AC-2 Measured baseline

- Model: `mlx-community/whisper-tiny`. The CLI declares it as the default, its Hugging Face API record reported `usedStorage: 148804126` bytes before download, and the observed model-cache delta was 89,243,648 bytes. This is the only model downloaded or measured.
- Source duration ms: 9696
- Cold elapsed ms: 5957
- Warm elapsed ms: 1158
- Output bytes: 1247
- Cache delta bytes: 89243648
- Timeout ms: 600000
- Max output bytes: 16777216
- Cleanup result: PASS — `TASK2_COMPLETED=true` and `TASK2_TEMP_REMOVED=true`; the task-created uv cache, Hugging Face cache, synthesized audio, JSON outputs, and runner script were removed.
- Transcript evidence: the cold and warm JSON text matched: `This is a deterministic English speech fixture for Pai Watch. The quick brown fox jumps over the lazy dog. Local transcription should preserve useful words and timestamps.` The validator found all eight evidence words: `english`, `speech`, `quick`, `brown`, `fox`, `local`, `transcription`, and `timestamps`; the only visible substitution was `pi` → `Pai`.
- Timestamp evidence: PASS — both outputs contained three segments. The validator required finite numeric `start`/`end`, `0 <= start <= end`, non-overlap/order against the prior segment, and `end <= 9.696313 + 0.5` seconds for every segment. The first observed segment was `start: 0`, `end: 3.24`, with the first sentence; `TIMESTAMPS_VALID=true` was emitted only after both outputs passed.

### Reproducible fixture and commands

1. Synthesize and normalize one local English fixture:

   ```text
   ["say", "-o", "<task-temp>/fixture.aiff", "This is a deterministic English speech fixture for pi watch. The quick brown fox jumps over the lazy dog. Local transcription should preserve useful words and timestamps."]
   ["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", "<task-temp>/fixture.aiff", "-ac", "1", "-ar", "16000", "<task-temp>/fixture.wav"]
   ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", "<task-temp>/fixture.wav"]
   ```

2. Install the package into an empty task-owned uv cache with a help-only probe. This produced a 2,088,624,128-byte pre-model cache and was excluded from cold transcription elapsed time.
3. Run the successful argv from AC-1 once against an empty task-owned Hugging Face cache (`cold`) and once against the same populated cache (`warm`), changing only `--output-dir`.
4. Bound each process to 600,000 ms and each stdout/stderr capture plus JSON read to 16,777,216 bytes.

### Measured resource observations

| Measurement | Cold | Warm |
|---|---:|---:|
| Transcription elapsed | 5,957 ms | 1,158 ms |
| Captured stdout | 0 bytes | 0 bytes |
| Captured stderr | 490 bytes | 340 bytes |
| JSON output | 1,247 bytes | 1,247 bytes |
| Total task cache after run | 2,177,867,776 bytes | 2,177,867,776 bytes |

The 9.696-second fixture ran at approximately 0.61× realtime on the cold path including model fetch and 0.12× realtime warm. This single tiny-model result proves the executable/output seam and a conservative bounded default candidate; it is not a general latency, memory, or accuracy benchmark and does not justify extrapolating linearly to long media.
