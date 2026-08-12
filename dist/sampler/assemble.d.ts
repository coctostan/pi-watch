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
import type { MediaType, ResolutionTier, TranscriptSegment, TranscriptSource, WatchedFrameSet } from "../contract/index.js";
import type { SelectedFrame } from "./select-frames.js";
import { type EvidenceRange } from "./range.js";
/**
 * Format a millisecond offset as mm:ss, switching to h:mm:ss past one hour.
 *
 * Replicates `serialize.ts`'s internal `formatMs` so every `WatchedFrame.timestamp`
 * is consistent project-wide. `serialize.ts` keeps its copy private; this is the
 * intentional, isolated duplication called out in the plan (do NOT edit serialize.ts).
 */
export declare function formatTimestamp(ms: number): string;
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
export declare function mergeTranscript(segments: TranscriptSegment[], durationMs: number, range?: EvidenceRange): TranscriptSegment[];
/** Decoded image payload aligned 1:1 to a SelectedFrame, in timeline order. */
export interface FrameImage {
    imageBase64: string;
    mediaType: MediaType;
}
export interface AssembleInput {
    /** Original video reference (local path or URL). */
    ref: string;
    /** Total source duration in ms. */
    durationMs: number;
    /** Effective absolute half-open evidence range; defaults to the full source. */
    range?: EvidenceRange;
    /** Effective frames-per-second the sampler captured. */
    fpsSampled: number;
    /** Selected frame times from `selectFrameTimes` (tMs-ascending). */
    selected: SelectedFrame[];
    /** Decoded images, aligned 1:1 and in the same order as `selected`. */
    images: FrameImage[];
    /** Resolution policy for these frames (caller-chosen; see boundaries). */
    resolution: ResolutionTier;
    /** Raw transcript segments to merge onto the timeline. */
    transcript: TranscriptSegment[];
    /** Transcript origin, or "none" when there is no transcript. */
    transcriptSource: TranscriptSource | "none";
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
export declare function assembleWatchedFrameSet(input: AssembleInput): WatchedFrameSet;
//# sourceMappingURL=assemble.d.ts.map