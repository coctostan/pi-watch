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
	resolveSource,
	type SceneDetectionDiagnostic,
} from "./effects.js";
import { selectFrameTimes } from "./select-frames.js";
import {
	fetchLocalAsrTranscript,
	type AsrDiagnostic,
	type LocalAsrPolicy,
} from "./asr.js";

export interface SampleOptions {
	/** Video reference: a local file path or an http(s) URL. */
	ref: string;
	/** Frame budget (absolute cap). Defaults to the pure core's default (~16). */
	budget?: number;
	/** Frame resolution policy. Defaults to "low" (DESIGN §3). */
	resolution?: ResolutionTier;
	/** ffmpeg scene-change sensitivity (0–1). Lower = more cuts. */
	sceneThreshold?: number;
	/** Best-effort side-channel for bounded scene-analysis fallbacks. */
	onSceneDetectionDiagnostic?: (diagnostic: SceneDetectionDiagnostic) => void;
	/** Optional bounded local ASR policy, selected by the extension's spoken intent gate. */
	localAsr?: LocalAsrPolicy;
	/** Best-effort side-channel for eligible local ASR failures. */
	onAsrDiagnostic?: (diagnostic: AsrDiagnostic) => void;
}

/**
 * Watch `ref`: produce a validated `WatchedFrameSet` on one shared timeline.
 *
 * Effects run sequentially at this boundary. Frame decoding scales with the
 * selected budget; scene analysis uses a reduced stream and duration/timeout
 * fallbacks so long media degrades to uniform sampling instead of failing.
 */
export async function sample(opts: SampleOptions): Promise<WatchedFrameSet> {
	const { ref } = opts;
	const resolution: ResolutionTier = opts.resolution ?? "low";
	const resolved = await resolveSource(ref);
	let samplingFailed = false;
	let samplingError: unknown;

	try {
		const mediaRef = resolved.mediaRef;

		// 1. Effect: total duration (defines the timeline's upper bound).
		const durationMs = await probeDurationMs(mediaRef);

		// 2. Effect: raw scene-change offsets.
		// Keep the callback best-effort even if a custom effect seam does not
		// implement that guarantee itself.
		const sceneDiagnosticOptions = opts.onSceneDetectionDiagnostic
			? {
					onDiagnostic: (diagnostic: SceneDetectionDiagnostic): void => {
						try {
							opts.onSceneDetectionDiagnostic?.(diagnostic);
						} catch {
							/* diagnostics are a best-effort side channel */
						}
					},
				}
			: undefined;
		const sceneCutsMs =
			opts.sceneThreshold === undefined
				? sceneDiagnosticOptions === undefined
					? await detectSceneCutsMs(mediaRef, durationMs)
					: await detectSceneCutsMs(mediaRef, durationMs, undefined, sceneDiagnosticOptions)
				: sceneDiagnosticOptions === undefined
					? await detectSceneCutsMs(mediaRef, durationMs, opts.sceneThreshold)
					: await detectSceneCutsMs(mediaRef, durationMs, opts.sceneThreshold, sceneDiagnosticOptions);

		// 3. Pure decision: budget-capped frame times (cuts + gap-gated backfill).
		const selected = selectFrameTimes({
			sceneCutsMs,
			durationMs,
			...(opts.budget === undefined ? {} : { budget: opts.budget }),
		});

		// 4. Effect: decode exactly the selected times, in order (images[i] ↔ selected[i]).
		const images = await decodeFramesAt(
			mediaRef,
			selected.map((s) => s.tMs),
			resolution,
		);

		// 5. Effects: captions first, then optional bounded local ASR on a caption miss.
		let transcript = await fetchTranscript(resolved.originalRef);
		if (transcript.source === "none" && opts.localAsr) {
			const onAsrDiagnostic = opts.onAsrDiagnostic
				? (diagnostic: AsrDiagnostic): void => {
						try {
							opts.onAsrDiagnostic?.(diagnostic);
						} catch {
							/* diagnostics are a best-effort side channel */
						}
					}
				: undefined;
			transcript = await fetchLocalAsrTranscript(
				mediaRef,
				durationMs,
				opts.localAsr,
				undefined,
				onAsrDiagnostic,
			);
		}

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
			transcript: transcript.segments,
			transcriptSource: transcript.source,
		});
	} catch (err) {
		samplingFailed = true;
		samplingError = err;
		throw err;
	} finally {
		if (resolved.ownership === "sampler-temporary") {
			try {
				await resolved.cleanup();
			} catch (cleanupErr) {
				if (samplingFailed) {
					const primaryError =
						samplingError instanceof Error ? samplingError : new Error(String(samplingError));
					const cleanupError =
						cleanupErr instanceof Error ? cleanupErr : new Error(String(cleanupErr));
					throw new AggregateError(
						[primaryError, cleanupError],
						`${primaryError.message} Temporary source cleanup also failed: ${cleanupError.message}`,
					);
				}
				throw cleanupErr;
			}
		}
}
}
