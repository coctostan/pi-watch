# Transcript-first operation and proof

`pi-watch` v0.5 stages transcript evidence before visual decoding and makes one deterministic route decision from question intent plus in-range transcript presence. This runbook explains the shipped behavior and the compiled-package proof. It does not claim semantic answer scoring, persistent transcript storage, general performance, or model quality.

## Runtime policy

For one `watch` call, the compiled extension:

1. Resolves the source and probes its duration.
2. Resolves one absolute half-open range `[startMs, endMs)`.
3. Acquires captions, conservatively normalizes rolling overlap, and clips cues to the range.
4. If the in-range caption transcript is empty, optionally tries explicitly enabled local ASR for spoken or mixed questions.
5. Routes broad, spoken, and mixed questions with a non-empty in-range transcript to tier 1.
6. Runs scene analysis and budgeted frame decode only for a transcript miss or an explicitly visual, temporal, or on-screen-text question.

A transcript-backed tier-1 call skips:

- `ffmpeg` scene-change analysis;
- `ffmpeg` frame decode;
- frame serialization into the tool result;
- tier-2 endpoint requests.

It does **not** skip source resolution, duration probing, range resolution, caption lookup, caption parsing/normalization, or eligible local ASR. Supported YouTube refs still contact YouTube through bounded `yt-dlp` operations and use resolver-owned temporary media.

Tier 2 is the implemented OpenAI-compatible **sampled-frame vision** adapter. It receives ordered base64 `image_url` blocks plus timeline text; it does not ingest a raw video file. Tier 3 returns sampled frames as Pi `ImageContent` to the orchestrator and remains the universal fallback.

## `/watch` local paths containing spaces

The slash command accepts one matching leading single- or double-quote pair around a non-empty ref:

```text
/watch '/Users/me/My Videos/demo clip.mov' What does the speaker say?
/watch "./clips/demo clip.mov" What changes after the title card?
```

Only the outer matching quotes are removed. Interior spaces are preserved verbatim, and a whitespace-delimited non-empty question must follow the closing quote.

This is intentionally not a shell parser. Backslash escapes, nested quotes, token concatenation, variable expansion, flags, and range syntax are not interpreted. For example, `$HOME` inside the quotes remains literal text rather than being expanded.

## Local ASR finite ceilings

Configured and direct adapter calls cannot raise duration or process timeout above the compiled 600,000 ms ceilings.

- A lower positive finite caller value remains authoritative.
- An oversized, non-finite, or non-positive direct value uses the finite compiled ceiling.
- Media over the effective duration limit returns the private `duration-limit` diagnostic before adapter storage or process work.
- Eligible work passes only the effective timeout and fixed 16 MiB process/output bound.

Local ASR remains exact-opt-in with `WATCH_ASR_LOCAL=1`, captions-first, spoken/mixed-only, and failure-total. See [Local speech transcription setup](LOCAL-ASR-SETUP.md).

## Range and coverage fields

`details.range` is the effective absolute half-open range. Explicit conversion-safe whole-second `start` / `end` values take precedence over supported URL start timestamps.

`details.availableEvidence` describes range-filtered evidence before final tool-result bounds. `details.returnedEvidence` describes only complete transcript segments and frame-label/image pairs retained after all result bounds. Each coverage value contains fixed-size counts and first/last absolute offsets; it contains no ref, question, transcript text, stderr, credentials, environment values, or cache paths.

A smaller returned count indicates output bounding, not missing source evidence. Transcript-only results report zero frame count and zero frame coverage.

## Deterministic compiled-package proof

Run:

```bash
npm run build
npx vitest run test/watch/context-efficiency.test.ts test/watch/asr-e2e.test.ts
```

The context-efficiency test reads `package.json.pi.extensions[0]`, imports that compiled `dist` path, captures the registered `watch` tool, and invokes it with test-owned executable shims. It does not import the source extension, contact a network, or call a model.

The versioned synthetic corpus is `test/fixtures/context-efficiency/transcript-first.fixture.json`. It represents rolling-caption overlap, a requested subsection, a transcript-sufficient frame-waste case, and an explicit same-corpus visual control. Scenario labels are derived from the fixture's intent, range, and question fields.

Exact v1 corpus evidence:

| Scenario | Absolute range | Available / returned transcript | Frames | `ffmpeg` scene / decode | Serialized result bytes | Text bytes |
|---|---:|---:|---:|---:|---:|---:|
| Spoken, full corpus | `[0, 22000)` | 9 / 9 | 0 | 0 / 0 | 1,374 | 477 |
| Broad, full corpus | `[0, 22000)` | 9 / 9 | 0 | 0 / 0 | 1,394 | 507 |
| Broad, requested subsection | `[4000, 12000)` | 4 / 4 | 0 | 0 / 0 | 1,077 | 306 |
| Explicit visual control, same corpus | `[0, 22000)` | 9 / 9 | 2 / 2 returned | 1 / 2 | 7,144 | 823 |

The full rolling-caption text is exactly 301 raw UTF-8 bytes and 235 normalized UTF-8 bytes. The visual control performs positive budget-bounded work and serializes more result context than every transcript case. These are synthetic corpus-scoped pipeline measurements, not a general percentage reduction, latency benchmark, memory benchmark, answer-quality comparison, or model-quality claim.

The shims and call ledger live in a unique OS temporary directory and are removed on success or failure. The nested `npm pack --dry-run --json` proof separately receives a unique test-owned npm cache through its child-process environment and removes it in `finally`; ambient/global npm-cache permissions do not determine the result.

## Optional live checks

Normal tests are deterministic, offline, and model-free. Real integrations remain explicit and finite:

```bash
# Real user-managed local ASR; skipped without the exact flag.
WATCH_ASR_LIVE=1 \
npx vitest run test/watch/asr-e2e.test.ts -t "\[phase19\]\[AC-3\]"

# Real configured tier-2 endpoint; skipped without the exact flag.
WATCH_TIER2_LIVE=1 \
WATCH_TIER2_BASE_URL="http://localhost:8080/v1" \
WATCH_TIER2_MODEL="mlx-community/Qwen3-VL-8B-Instruct-4bit" \
npx vitest run test/watch/tier2.live.test.ts
```

Live checks may use network access for user-managed models/endpoints. They do not alter the default local-first requirement.

## Ownership, privacy, and fallback

- Caller local files are borrowed and never deleted.
- Resolver-, caption-, ASR-, proof-, and package-cache temporary storage is owned by the component that created it and removed on success or failure.
- User package and model caches are never cleanup targets.
- Runtime diagnostics remain typed and private; refs, transcript text, stderr, credentials, environment values, and cache paths are excluded.
- Missing captions, ASR failure, tier-2 failure, or transcript miss never fabricates evidence. The ordered visual path remains available, and tier 3 remains total.
- Cloud providers are optional and never required by the default proof or runtime configuration.
