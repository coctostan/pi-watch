import type { TranscriptSegment } from "../contract/index.js";
/**
 * Remove conservative rolling-caption overlap from ordered adjacent segments.
 * Timing and source fields are retained from each current raw cue, and input
 * segments are never mutated.
 */
export declare function normalizeCaptionSegments(segments: readonly TranscriptSegment[]): TranscriptSegment[];
/** Parse and normalize WebVTT cues into stable, ordered caption segments without I/O. */
export declare function parseWebVtt(input: string): TranscriptSegment[];
//# sourceMappingURL=captions.d.ts.map