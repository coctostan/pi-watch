/**
 * sample.ts — the sampler entry point (DESIGN.md §2/§3).
 *
 * `sample()` is the single surface that turns a real video reference into a
 * validated `WatchedFrameSet`. It composes the effect boundary (effects.ts)
 * with the frozen pure core (select-frames.ts / assemble.ts): probe duration →
 * detect scene cuts → pick budget-capped times (pure) → decode those frames →
 * fetch a best-effort transcript → assemble.
 *
 * This is the function the router (Phase 4) and the `watch` tool (Phase 5) will
 * wrap. It owns orchestration only — every spawn / parse detail lives in
 * effects.ts, every decision / assembly rule lives in the pure core. It performs
 * no validation of its own; `assembleWatchedFrameSet` guarantees a contract-valid
 * result (and throws on a programmer error such as a frame/time count mismatch).
 */

import type { ResolutionTier, WatchedFrameSet } from "../contract/index.js";
import { assembleWatchedFrameSet } from "./assemble.js";
import {
	decodeFramesAt,
	detectSceneCutsMs,
	fetchTranscript,
	probeDurationMs,
} from "./effects.js";
import { selectFrameTimes } from "./select-frames.js";

export interface SampleOptions {
	/** Video reference: a local file path or an http(s) URL. */
	ref: string;
	/** Frame budget (absolute cap). Defaults to the pure core's default (~16). */
	budget?: number;
	/** Frame resolution policy. Defaults to "low" (DESIGN §3). */
	resolution?: ResolutionTier;
	/** ffmpeg scene-change sensitivity (0–1). Lower = more cuts. */
	sceneThreshold?: number;
}

/**
 * Watch `ref`: produce a validated `WatchedFrameSet` on one shared timeline.
 *
 * Effects run sequentially at this boundary; frames are decoded ONLY at the
 * selected times (bounded by `budget`), so cost scales with the budget, not the
 * clip length.
 */
export async function sample(opts: SampleOptions): Promise<WatchedFrameSet> {
	const { ref } = opts;
	const resolution: ResolutionTier = opts.resolution ?? "low";

	// 1. Effect: total duration (defines the timeline's upper bound).
	const durationMs = await probeDurationMs(ref);

	// 2. Effect: raw scene-change offsets.
	const sceneCutsMs =
		opts.sceneThreshold === undefined
			? await detectSceneCutsMs(ref, durationMs)
			: await detectSceneCutsMs(ref, durationMs, opts.sceneThreshold);

	// 3. Pure decision: budget-capped frame times (cuts + gap-gated backfill).
	const selected = selectFrameTimes({
		sceneCutsMs,
		durationMs,
		...(opts.budget === undefined ? {} : { budget: opts.budget }),
	});

	// 4. Effect: decode exactly the selected times, in order (images[i] ↔ selected[i]).
	const images = await decodeFramesAt(
		ref,
		selected.map((s) => s.tMs),
		resolution,
	);

	// 5. Effect: best-effort transcript (degrades to "none").
	const { segments, source } = await fetchTranscript(ref);

	// 6. Effective frames-per-second the sampler actually captured.
	const fpsSampled =
		selected.length > 0 && durationMs > 0 ? selected.length / (durationMs / 1000) : 0;

	// 7. Pure assembly → contract-valid WatchedFrameSet.
	return assembleWatchedFrameSet({
		ref,
		durationMs,
		fpsSampled,
		selected,
		images,
		resolution,
		transcript: segments,
		transcriptSource: source,
	});
}
