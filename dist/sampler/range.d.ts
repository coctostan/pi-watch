import type { TranscriptSegment } from "../contract/index.js";
import type { SelectedFrame } from "./select-frames.js";
/** Largest whole-second value whose millisecond conversion is a safe integer. */
export declare const MAX_RANGE_SECONDS: number;
export interface EvidenceRange {
    startMs: number;
    endMs: number;
}
export interface EvidenceCoverage {
    count: number;
    firstMs: number | null;
    lastMs: number | null;
}
export interface ResolveEvidenceRangeInput {
    durationMs: number;
    urlStartSeconds?: number;
    startSeconds?: number;
    endSeconds?: number;
}
/** Parse optional start-only metadata from a URL without deciding URL support. */
export declare function parseYouTubeStartSeconds(ref: string): number | undefined;
/** Resolve explicit/URL bounds to one absolute half-open source range. */
export declare function resolveEvidenceRange(input: ResolveEvidenceRangeInput): EvidenceRange;
/** Keep intersecting cues, clip at range boundaries, and preserve stable ordering/text/source. */
export declare function clipTranscriptToRange(segments: readonly TranscriptSegment[], range: EvidenceRange): TranscriptSegment[];
/** Convert absolute source cuts inside the range to range-relative offsets. */
export declare function sceneCutsWithinRange(sceneCutsMs: readonly number[], range: EvidenceRange): number[];
/** Rebase range-relative frame decisions to absolute source offsets. */
export declare function rebaseSelectedFrames(selected: readonly SelectedFrame[], range: EvidenceRange): SelectedFrame[];
export declare function summarizeTranscriptCoverage(segments: readonly TranscriptSegment[]): EvidenceCoverage;
export declare function summarizeFrameCoverage(frames: readonly {
    tMs: number;
}[]): EvidenceCoverage;
//# sourceMappingURL=range.d.ts.map