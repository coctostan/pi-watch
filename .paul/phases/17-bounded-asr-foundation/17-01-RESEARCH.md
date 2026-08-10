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


## AC-3 Boundary decision

### Selected design

Select alternative **A: classify question intent at the extension boundary and pass a narrow ASR policy into `sample`**.

The production composition is:

```text
watchExtension/processItem
  ├─ classifyQuestion(question)                     # existing pure router helper
  ├─ resolveWatchConfig(process.env)                # existing pure config resolver
  └─ sample({ ref, ..., asr: spoken+enabled policy })
       ├─ resolveSource(ref)                         # originalRef + local mediaRef + ownership
       ├─ probeDurationMs(mediaRef)
       ├─ existing frame sampling                    # unchanged visual fallback material
       ├─ fetchTranscript(originalRef)               # captions first
       └─ if captions absent and ASR policy present:
            fetchLocalAsrTranscript(mediaRef, durationMs, policy)
              ├─ reject duration above hard policy
              ├─ argv-only mlx_whisper process
              ├─ bounded transcript.json read/parse
              └─ remove adapter-owned output directory
```

**Why this boundary:** question classification remains pure and question-only in `src/router/route.ts`; the sampler receives no question text and learns no router keyword policy. The extension already owns question/config composition for both `watch` and `watch_batch`, so it can pass ASR policy only when `classifyQuestion(question).intent === "spoken"` and local ASR is explicitly enabled. `route()` may classify the question again after sampling; that harmless pure recomputation avoids changing the stable router API.

**Captions-first ordering:** `fetchTranscript` remains the caption-only function and receives `originalRef`, preserving canonical YouTube lookup. Only `{ segments: [], source: "none" }` permits local ASR. A valid caption result suppresses ASR completely.

**Local media boundary:** local ASR receives `resolved.mediaRef`, so a supported YouTube URL uses resolver-owned downloaded media while a caller path remains borrowed. The ASR adapter reads that ref only; it never deletes, renames, or uploads it. `sample` retains sole responsibility for invoking resolver cleanup in its existing `finally` block.

**ASR effect boundary:** create focused `src/sampler/asr.ts` rather than adding another process/filesystem concern to the 720-line `effects.ts`. The module owns the pure JSON-to-`TranscriptSegment[]` parser plus one injected, argv-only process/filesystem shell. It creates and removes only a `pi-watch-asr-*` output directory, reads only the exact `transcript.json` regular file after a pre-read size check, and returns `source: "whisper"` on valid non-empty output. It does not create a separate audio copy because the observed CLI accepts the local media ref directly.

**Failure and diagnostics:** ASR is best-effort and never prevents visual routing. Missing executable, duration limit, timeout, non-zero exit, absent/oversized/malformed JSON, invalid timestamps, empty transcript, setup/read failure, and cleanup failure all return `source: "none"`. A best-effort callback emits a privacy-safe typed `AsrDiagnostic` with one of `duration-limit`, `missing-executable`, `timeout`, `process-error`, `invalid-output`, or `cleanup-error`, plus bounded numeric/config metadata only—never media paths, transcript text, stderr bodies, or credentials. `watch` and each batch item collect this callback like the existing scene/tier-2 diagnostics and surface it only when ASR was eligible but did not produce a transcript.

**Timeline validation:** parse JSON as unknown data. For each segment, require finite numeric second offsets, `0 <= start <= end`, non-empty text, and `start < duration`. Convert to rounded integer milliseconds, clamp `endMs` to `durationMs`, attach `source: "whisper"`, preserve stable input order for equal starts, and sort by `startMs`. If no valid segments remain, degrade to `none`; never fabricate transcript text from the top-level aggregate field.

**Ownership:** the executable and Hugging Face model cache are user-managed external prerequisites. The extension must not install packages, mutate a repository environment, or remove package/model caches. This choice avoids surprising a media request with the observed ~2.09 GB uv package-cache population. Phase 19 setup can recommend a user-controlled `uv tool install mlx-whisper`; `WATCH_ASR_EXECUTABLE` may name that binary or an absolute compatible executable path.

### Rejected alternatives

**B — pass the full question into the sampler.** Rejected because it couples sampler I/O to router keyword policy, duplicates `classifyQuestion`, leaks user question data deeper than necessary, and makes sampler behavior harder to test as pure policy input. The sampler needs only an optional bounded ASR policy.

**C — run ASR for every captionless sample.** Rejected because visual and on-screen-text questions do not benefit from speech transcription, first-use package/model cost is material, and it violates cheapest-tier discipline. It would also make batch resource usage less predictable.

**Embed the Python API.** Rejected because the console script already emits stable JSON, while embedding Python would add a second integration surface and repository/runtime dependency ownership.

**Invoke `uvx` automatically in production.** Rejected as the default because the package-only probe populated roughly 2.09 GB before model data. Installation must be an explicit user setup action, not a hidden side effect of a `watch` call. The research spike may use `uvx`; production targets the observed `mlx_whisper` console contract directly.

**Add ASR directly to `effects.ts`.** Rejected because that file already owns source resolution, captions, duration, scenes, and frame decoding. A focused ASR module is the minimum extraction directly enabling this milestone; unrelated decomposition remains out of scope.

**Extract audio before transcription.** Rejected for the first implementation because the observed executable accepts the local media file directly. Avoiding a second large temporary artifact simplifies storage bounds and cleanup. Revisit only with measured compatibility evidence.

### Provisional defaults

| Field | Default / rule | Evidence and rationale |
|---|---|---|
| Enablement | disabled; exact `WATCH_ASR_LOCAL=1` opt-in | Preserves the network-free/default behavior and prevents surprise model use |
| Executable | `mlx_whisper`, configurable by `WATCH_ASR_EXECUTABLE` | Observed console script; direct execution avoids implicit package installation |
| Model | `mlx-community/whisper-tiny`, configurable by `WATCH_ASR_MODEL` | CLI default; one measured 148,804,126-byte model candidate with valid output |
| Language/task | `en` / `transcribe` | Milestone is English-first; translation is explicitly deferred |
| Max media duration | 600,000 ms, configurable downward with `WATCH_ASR_MAX_DURATION_MS` | Matches the existing ten-minute scene-analysis ceiling; no long-media chunking |
| Process timeout | 300,000 ms, configurable up to the absolute 600,000 ms research ceiling with `WATCH_ASR_TIMEOUT_MS` | Measured 5,957 ms cold and 1,158 ms warm for 9.696 s; five minutes is conservative without claiming linear scaling |
| Captured output / JSON read | 16,777,216 bytes absolute maximum | Same bounded artifact ceiling used by captions/research; measured JSON was 1,247 bytes |
| Output location | adapter-owned `pi-watch-asr-*` OS temporary directory | Exact deterministic JSON path, always cleaned; source/cache paths remain borrowed |
| Concurrency | existing `watch_batch` item behavior, one ASR process per eligible item | No new fan-out mechanism; batch item cap remains authoritative |

`resolveWatchConfig(env, overrides?)` should expose `localAsr: LocalAsrConfig | null` with the existing precedence rule: explicit override (including `null`) > environment > defaults. Other ASR variables do not enable ASR without `WATCH_ASR_LOCAL=1`. Empty/invalid executable, model, duration, or timeout values fall back safely; duration cannot exceed 600,000 ms, timeout cannot exceed 600,000 ms, and the output ceiling is not user-increasable.

### Plan 17-02 files

**Create:**

- `src/sampler/asr.ts`
- `test/sampler/asr.test.ts`
- Generated build counterparts: `dist/sampler/asr.js`, `dist/sampler/asr.js.map`, `dist/sampler/asr.d.ts`, `dist/sampler/asr.d.ts.map`

**Modify:**

- `src/sampler/sample.ts` — accept optional narrow ASR policy and compose captions-first → ASR-second using `originalRef`/`mediaRef` correctly.
- `src/sampler/index.ts` — export the ASR policy/diagnostic surface needed by the extension.
- `src/config/config.ts` and `src/config/index.ts` — resolve the opt-in local-ASR config with explicit/env/default precedence and hard upper bounds.
- `src/watch/extension.ts` — call existing `classifyQuestion` before sampling for single/batch items, pass policy only for spoken intent, and collect privacy-safe diagnostics.
- `test/sampler/sample.test.ts`, `test/config/config.test.ts`, and `test/watch/extension.test.ts` — deterministic composition and fallback coverage.
- Generated `.js`, `.js.map`, `.d.ts`, and `.d.ts.map` counterparts under `dist/sampler/`, `dist/config/`, and `dist/watch/` for the five modified source modules, produced only by `npm run build`.

**Context-only; do not modify:**

- `src/router/route.ts` and `test/router/route.test.ts` — reuse the existing pure `classifyQuestion` behavior.
- `src/contract/watched-frame-set.ts` — `TranscriptSource` already includes `"whisper"`.
- `src/sampler/effects.ts` — captions/source/frame effects stay unchanged; ASR gets its focused module.
- `package.json` and `package-lock.json` — the runtime remains an external optional prerequisite.

### Plan 17-02 test matrix

Plan 17-02 should be `type: tdd` with RED → GREEN → REFACTOR gates.

| Surface | RED expectations | GREEN evidence target |
|---|---|---|
| Pure ASR JSON parser | Valid segments become ordered rounded-ms `source: "whisper"` values; malformed shapes, invalid/non-finite/reversed/out-of-duration timestamps, and empty text are rejected/dropped without aggregate-text fabrication | `test/sampler/asr.test.ts` focused parser cases pass |
| ASR process boundary | Exact argv contains one media ref plus model/language/task/JSON/output flags; no shell; duration over cap does not spawn; missing executable, timeout, non-zero exit, oversized/absent/malformed output, and filesystem failures return `none` with typed diagnostics | Injected process/fs tests pass and assert exactly-once cleanup |
| Ownership/privacy | Caller/resolver media and user caches are never removed; only adapter output storage is removed on success and every failure; diagnostics omit ref, transcript, stderr, and secrets | Cleanup spies and diagnostic shape assertions pass |
| Config pure core | Default disabled; exact opt-in; executable/model defaults and overrides; explicit `null` wins; invalid values fall back; duration/timeout cannot exceed absolute ceilings; unrelated config remains unchanged | `test/config/config.test.ts` focused cases pass |
| Sampler composition | Captions suppress ASR; caption absence + spoken policy calls ASR with `mediaRef` and probed duration; valid ASR reaches `transcriptSource: "whisper"`; every ASR failure preserves `none`; resolver cleanup behavior is unchanged | `test/sampler/sample.test.ts` focused cases pass |
| Extension gating | Enabled spoken questions pass policy; visual/on-screen-text and disabled config never do; single and batch paths behave identically; eligible failure diagnostic is surfaced without changing tier-2/scene details | `test/watch/extension.test.ts` focused cases pass |
| Stable contracts | Router intent/tier tests, caption tests, frame sampling, tier adapters, batching bounds, and registered tool schemas remain green | `npm test` is baseline-or-better (210 pass / 2 skip), `npm run typecheck`, and `npm run build` pass |
| Distribution | Build creates only expected compiled counterparts and a second clean build produces no diff | `npm run build && git diff --exit-code -- dist` after staging expected generated output |

The REFACTOR gate should keep pure parsing/config decisions directly testable and side effects injected at the new ASR boundary. It must not broaden into caption normalization, question-aware transcript retrieval, frame-skipping optimization, generic process-framework extraction, or unrelated `effects.ts` decomposition.
