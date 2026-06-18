/**
 * pi-watch sampler core — public surface.
 *
 * The pure, deterministic heart of the sampler (DESIGN.md §3): frame selection
 * (scene-cut + uniform backfill + budget cap), transcript merge onto the shared
 * timeline, and assembly of a validated `WatchedFrameSet`. No ffmpeg, no I/O,
 * no model calls — the effect boundary lands in 03-02.
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
