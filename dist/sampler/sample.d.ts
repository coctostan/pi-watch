/**
 * sample.ts — the sampler entry point (DESIGN.md §2/§3).
 *
 * `sample()` is the single surface that turns a real video reference into a
 * validated `WatchedFrameSet`. It composes the effect boundary with the pure
 * selection/assembly core in stages: resolve + probe + range → captions →
 * eligible ASR → routing predicate → optional scene selection + frame decode.
 *
 * Callers that omit the predicate retain visual-sampling compatibility. A false
 * predicate returns a contract-valid transcript-only set while the same
 * ownership `finally` handles success and failure on both branches.
 */
import type { ResolutionTier, WatchedFrameSet } from "../contract/index.js";
import { type SceneDetectionDiagnostic } from "./effects.js";
import { type AsrDiagnostic, type LocalAsrPolicy } from "./asr.js";
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
    needsVisualEvidence?: (context: {
        hasTranscript: boolean;
    }) => boolean;
}
/**
 * Watch `ref`: produce a validated `WatchedFrameSet` on one shared timeline.
 *
 * Transcript acquisition precedes visual work. When visual evidence is needed,
 * frame decoding remains budget-capped and scene analysis keeps its bounded
 * duration/timeout fallbacks.
 */
export declare function sample(opts: SampleOptions): Promise<WatchedFrameSet>;
//# sourceMappingURL=sample.d.ts.map