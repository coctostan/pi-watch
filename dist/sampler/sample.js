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
import { assembleWatchedFrameSet } from "./assemble.js";
import { decodeFramesAt, detectSceneCutsMs, fetchTranscript, probeDurationMs, resolveSource, } from "./effects.js";
import { selectFrameTimes } from "./select-frames.js";
/**
 * Watch `ref`: produce a validated `WatchedFrameSet` on one shared timeline.
 *
 * Effects run sequentially at this boundary; frames are decoded ONLY at the
 * selected times (bounded by `budget`), so cost scales with the budget, not the
 * clip length.
 */
export async function sample(opts) {
    const { ref } = opts;
    const resolution = opts.resolution ?? "low";
    const resolved = await resolveSource(ref);
    let samplingFailed = false;
    let samplingError;
    try {
        const mediaRef = resolved.mediaRef;
        // 1. Effect: total duration (defines the timeline's upper bound).
        const durationMs = await probeDurationMs(mediaRef);
        // 2. Effect: raw scene-change offsets.
        const sceneCutsMs = opts.sceneThreshold === undefined
            ? await detectSceneCutsMs(mediaRef, durationMs)
            : await detectSceneCutsMs(mediaRef, durationMs, opts.sceneThreshold);
        // 3. Pure decision: budget-capped frame times (cuts + gap-gated backfill).
        const selected = selectFrameTimes({
            sceneCutsMs,
            durationMs,
            ...(opts.budget === undefined ? {} : { budget: opts.budget }),
        });
        // 4. Effect: decode exactly the selected times, in order (images[i] ↔ selected[i]).
        const images = await decodeFramesAt(mediaRef, selected.map((s) => s.tMs), resolution);
        // 5. Effect: best-effort transcript (degrades to "none").
        const { segments, source } = await fetchTranscript(ref);
        // 6. Effective frames-per-second the sampler actually captured.
        const fpsSampled = selected.length > 0 && durationMs > 0 ? selected.length / (durationMs / 1000) : 0;
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
    catch (err) {
        samplingFailed = true;
        samplingError = err;
        throw err;
    }
    finally {
        if (resolved.ownership === "sampler-temporary") {
            try {
                await resolved.cleanup();
            }
            catch (cleanupErr) {
                if (samplingFailed) {
                    const primaryError = samplingError instanceof Error ? samplingError : new Error(String(samplingError));
                    const cleanupError = cleanupErr instanceof Error ? cleanupErr : new Error(String(cleanupErr));
                    throw new AggregateError([primaryError, cleanupError], `${primaryError.message} Temporary source cleanup also failed: ${cleanupError.message}`);
                }
                throw cleanupErr;
            }
        }
    }
}
//# sourceMappingURL=sample.js.map