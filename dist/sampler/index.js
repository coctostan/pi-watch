/**
 * pi-watch sampler core — public surface.
 *
 * The sampler (DESIGN.md §2/§3). Two layers, one boundary:
 *   - a pure, deterministic core: frame selection (scene-cut + uniform backfill
 *     + budget cap), transcript merge, and assembly of a validated
 *     `WatchedFrameSet`;
 *   - an explicit effect boundary (effects.ts) that shells out to ffprobe /
 *     ffmpeg / a best-effort transcript source; and
 *   - `sample()`, the entry point that composes them into the one surface the
 *     router (Phase 4) and `watch` tool (Phase 5) wrap.
 */
export { selectFrameTimes, } from "./select-frames.js";
export { formatTimestamp, mergeTranscript, assembleWatchedFrameSet, } from "./assemble.js";
export { probeDurationMs, detectSceneCutsMs, decodeFramesAt, fetchTranscript, parseDurationMs, parseSceneCutsMs, parseWebVtt, normalizeYouTubeUrl, classifySourceRef, resolveSource, ProcessTimeoutError, } from "./effects.js";
export { fetchLocalAsrTranscript, parseMlxWhisperJson, DEFAULT_LOCAL_ASR_EXECUTABLE, DEFAULT_LOCAL_ASR_MODEL, DEFAULT_LOCAL_ASR_MAX_DURATION_MS, DEFAULT_LOCAL_ASR_TIMEOUT_MS, MAX_LOCAL_ASR_DURATION_MS, MAX_LOCAL_ASR_TIMEOUT_MS, MAX_LOCAL_ASR_OUTPUT_BYTES, } from "./asr.js";
export { sample } from "./sample.js";
//# sourceMappingURL=index.js.map