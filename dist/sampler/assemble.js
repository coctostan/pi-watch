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
export function mergeTranscript(segments, durationMs) {
    return segments
        .filter((seg) => seg.text.trim().length > 0 && seg.startMs < durationMs)
        .map((seg) => ({
        startMs: seg.startMs,
        endMs: Math.min(Math.max(seg.endMs, seg.startMs), durationMs),
        text: seg.text,
        source: seg.source,
    }))
        .sort((a, b) => a.startMs - b.startMs);
}
/**
 * Assemble a `WatchedFrameSet` from selected times + images + transcript + metadata.
 *
 * Each `selected[i]` pairs with `images[i]` to produce a `WatchedFrame` with a
 * sequential zero-based index, an mm:ss timestamp derived from its tMs, and the
 * supplied resolution tier. Frames are already tMs-ascending (selectFrameTimes
 * guarantees it). The transcript is merged onto the same timeline and
 * source.frameCount is set to frames.length.
 *
 * Pure: no I/O, no mutation of inputs. Throws on a programmer error
 * (images/selected length mismatch) rather than silently dropping frames.
 */
export function assembleWatchedFrameSet(input) {
    if (input.images.length !== input.selected.length) {
        throw new Error(`assembleWatchedFrameSet: images length (${input.images.length}) ` +
            `must equal selected length (${input.selected.length}).`);
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
    const transcript = mergeTranscript(input.transcript, input.durationMs);
    const source = {
        ref: input.ref,
        durationMs: input.durationMs,
        fpsSampled: input.fpsSampled,
        frameCount: frames.length,
        transcriptSource: input.transcriptSource,
    };
    return { source, frames, transcript };
}
//# sourceMappingURL=assemble.js.map