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

export {
	selectFrameTimes,
	type SelectedFrame,
	type SelectOptions,
} from "./select-frames.js";

export {
	formatTimestamp,
	mergeTranscript,
	assembleWatchedFrameSet,
	type FrameImage,
	type AssembleInput,
} from "./assemble.js";

export {
	probeDurationMs,
	detectSceneCutsMs,
	decodeFramesAt,
	fetchTranscript,
	parseDurationMs,
	parseSceneCutsMs,
} from "./effects.js";

export { sample, type SampleOptions } from "./sample.js";
