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
import { assembleTranscriptStage, attachSampledFrames } from "./assemble.js";
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
	rebaseSelectedFrames,
	resolveEvidenceRange,
	sceneCutsWithinRange,
} from "./range.js";
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
	/** Optional inclusive start bound in conversion-safe whole seconds. */
	start?: number;
	/** Optional exclusive end bound in conversion-safe whole seconds. */
	end?: number;
	/** ffmpeg scene-change sensitivity (0–1). Lower = more cuts. */
	sceneThreshold?: number;
	/** Best-effort side-channel for bounded scene-analysis fallbacks. */
	onSceneDetectionDiagnostic?: (diagnostic: SceneDetectionDiagnostic) => void;
	/** Optional bounded local ASR policy, selected by the extension's spoken intent gate. */
	localAsr?: LocalAsrPolicy;
	/** Best-effort side-channel for eligible local ASR failures. */
	onAsrDiagnostic?: (diagnostic: AsrDiagnostic) => void;
	/** Decide after transcript staging whether scene detection and frame decode are required. */
	needsVisualEvidence?: (context: { hasTranscript: boolean }) => boolean;
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

		// 1. Resolve the shared timeline and absolute evidence range.
		const durationMs = await probeDurationMs(mediaRef);
		const range = resolveEvidenceRange({
			durationMs,
			urlStartSeconds: resolved.urlStartSeconds,
			startSeconds: opts.start,
			endSeconds: opts.end,
		});
		const rangeDurationMs = range.endMs - range.startMs;

		// 2. Acquire and range-filter captions before any visual work.
		let transcript = await fetchTranscript(resolved.originalRef);
		let stage = assembleTranscriptStage({
			ref,
			durationMs,
			range,
			transcript: transcript.segments,
			transcriptSource: transcript.source,
		});

		// 3. On an in-range caption miss, try eligible bounded local ASR.
		if (stage.source.transcriptSource === "none" && opts.localAsr) {
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
			stage = assembleTranscriptStage({
				ref,
				durationMs,
				range,
				transcript: transcript.segments,
				transcriptSource: transcript.source,
			});
		}

		const hasTranscript =
			stage.transcript.length > 0 && stage.source.transcriptSource !== "none";
		if (opts.needsVisualEvidence && !opts.needsVisualEvidence({ hasTranscript })) {
			return stage;
		}

		// 4. Visual work runs only when the staged decision requires it.
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

		const relativeSelected = selectFrameTimes({
			sceneCutsMs: sceneCutsWithinRange(sceneCutsMs, range),
			durationMs: rangeDurationMs,
			...(opts.budget === undefined ? {} : { budget: opts.budget }),
		});
		const selected = rebaseSelectedFrames(relativeSelected, range);
		const images = await decodeFramesAt(
			mediaRef,
			selected.map((selectedFrame) => selectedFrame.tMs),
			resolution,
		);
		const fpsSampled =
			selected.length > 0 && rangeDurationMs > 0
				? selected.length / (rangeDurationMs / 1000)
				: 0;

		return attachSampledFrames(stage, {
			fpsSampled,
			selected,
			images,
			resolution,
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
