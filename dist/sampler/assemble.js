/**
 * assemble.ts — pure assembly of a validated `WatchedFrameSet`.
 *
 * Turns the selection layer's output (SelectedFrame[] from select-frames.ts)
 * plus decoded image payloads, a transcript, and source metadata into the
 * tier-neutral `WatchedFrameSet` (DESIGN.md §6) that every tier consumes and
 * that passes `validateWatchedFrameSet`. Also merges the transcript onto the
 * same shared timeline.
 *
 * Fully pure: input → output, no I/O, no mutation of inputs. Real frame
 * extraction / transcript fetch live behind the effect boundary in 03-02.
 */
import { clipTranscriptToRange, summarizeFrameCoverage, summarizeTranscriptCoverage, } from "./range.js";
/**
 * Format a millisecond offset as mm:ss, switching to h:mm:ss past one hour.
 *
 * Replicates `serialize.ts`'s internal `formatMs` so every `WatchedFrame.timestamp`
 * is consistent project-wide. `serialize.ts` keeps its copy private; this is the
 * intentional, isolated duplication called out in the plan (do NOT edit serialize.ts).
 */
export function formatTimestamp(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, "0");
    if (hours > 0) {
        return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
}
/**
 * Merge raw transcript segments onto the shared timeline.
 *
 * Pure transform:
 *   - drops empty/whitespace-only segments and cues starting at/after durationMs;
 *   - clamps retained endMs to min(max(endMs, startMs), durationMs), preserving
 *     endMs >= startMs and endMs <= durationMs;
 *   - sorts by startMs ascending (stable);
 *   - preserves each retained segment's source and original text.
 *
 * The result satisfies the transcript invariants enforced by
 * `validateWatchedFrameSet`.
 */
export function mergeTranscript(segments, durationMs, range = { startMs: 0, endMs: durationMs }) {
    const normalized = segments
        .filter((seg) => seg.text.trim().length > 0 && seg.startMs < durationMs)
        .map((seg) => ({
        startMs: seg.startMs,
        endMs: Math.min(Math.max(seg.endMs, seg.startMs), durationMs),
        text: seg.text,
        source: seg.source,
    }))
        .sort((a, b) => a.startMs - b.startMs);
    if (range.startMs === 0 && range.endMs === durationMs)
        return normalized;
    return clipTranscriptToRange(normalized, range);
}
/**
 * Build a transcript-only `WatchedFrameSet` after range filtering.
 *
 * The stage is contract-valid with zero frame count, FPS, and frame coverage.
 * Pure: no I/O and no mutation of inputs.
 */
export function assembleTranscriptStage(input) {
    const range = input.range ?? { startMs: 0, endMs: input.durationMs };
    const transcript = mergeTranscript(input.transcript, input.durationMs, range);
    const frames = [];
    const source = {
        ref: input.ref,
        durationMs: input.durationMs,
        fpsSampled: 0,
        frameCount: 0,
        transcriptSource: transcript.length === 0 ? "none" : input.transcriptSource,
        range,
        available: {
            frames: summarizeFrameCoverage(frames),
            transcript: summarizeTranscriptCoverage(transcript),
        },
    };
    return { source, frames, transcript };
}
/** Attach decoded frames to a transcript stage without reacquiring transcript evidence. */
export function attachSampledFrames(stage, input) {
    if (input.images.length !== input.selected.length) {
        throw new Error(`attachSampledFrames: images length (${input.images.length}) ` +
            `must equal selected length (${input.selected.length}).`);
    }
    if (!Number.isFinite(input.fpsSampled) ||
        (input.selected.length === 0 && input.fpsSampled !== 0) ||
        (input.selected.length > 0 && input.fpsSampled <= 0)) {
        throw new Error("attachSampledFrames: fpsSampled must be finite and zero exactly when no frames are selected.");
    }
    const frames = input.selected.map((sel, i) => {
        const image = input.images[i];
        return {
            index: i,
            tMs: sel.tMs,
            timestamp: formatTimestamp(sel.tMs),
            imageBase64: image.imageBase64,
            mediaType: image.mediaType,
            resolution: input.resolution,
            origin: sel.origin,
        };
    });
    return {
        source: {
            ...stage.source,
            fpsSampled: input.fpsSampled,
            frameCount: frames.length,
            available: {
                frames: summarizeFrameCoverage(frames),
                transcript: stage.source.available?.transcript ?? summarizeTranscriptCoverage(stage.transcript),
            },
        },
        frames,
        transcript: stage.transcript,
    };
}
/** Compatibility composition for callers that already have transcript and frame evidence. */
export function assembleWatchedFrameSet(input) {
    const stage = assembleTranscriptStage(input);
    return attachSampledFrames(stage, input);
}
//# sourceMappingURL=assemble.js.map