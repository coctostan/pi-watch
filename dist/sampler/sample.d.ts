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
import { type SceneDetectionDiagnostic } from "./effects.js";
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
}
/**
 * Watch `ref`: produce a validated `WatchedFrameSet` on one shared timeline.
 *
 * Effects run sequentially at this boundary. Frame decoding scales with the
 * selected budget; scene analysis uses a reduced stream and duration/timeout
 * fallbacks so long media degrades to uniform sampling instead of failing.
 */
export declare function sample(opts: SampleOptions): Promise<WatchedFrameSet>;
//# sourceMappingURL=sample.d.ts.map