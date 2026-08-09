/**
 * select-frames.ts — the pure frame-selection core of the sampler.
 *
 * This is the load-bearing *decision* layer (DESIGN.md §3): given the raw
 * scene-change offsets ffmpeg found, a clip duration, and a frame budget, it
 * decides exactly which moments of the video the model will ever see and
 * enforces the budget that guards against token blowup (PRD Risks).
 *
 * It is fully pure: input → output, no I/O, no mutation of inputs, no
 * randomness. Real frame extraction / ffprobe / scene detection live behind the
 * effect boundary in 03-02; this module only does arithmetic over offsets.
 */
import type { FrameOrigin } from "../contract/index.js";
/** A chosen frame time on the shared timeline, tagged by how it was picked. */
export interface SelectedFrame {
    tMs: number;
    origin: FrameOrigin;
}
export interface SelectOptions {
    /** Raw scene-change offsets in ms; may be unsorted, duplicated, out of range. */
    sceneCutsMs: number[];
    /** Total clip duration in ms; frame times live in the half-open range [0, durationMs). */
    durationMs: number;
    /** Frame budget (absolute cap). Default 16 (DESIGN §3). Coerced to a >= 0 integer. */
    budget?: number;
}
/**
 * Select the ordered, budget-capped frame times for a clip.
 *
 * Algorithm (deterministic; no Math.random):
 *   1. Normalize cuts: floor to integers, keep those in [0, durationMs), dedupe,
 *      sort ascending.
 *   2. budget = max(0, floor(budget ?? 16)). budget === 0 → [].
 *   3. cuts.length >= budget → uniformly subsample the cuts to `budget` picks,
 *      preserving temporal spread (never the first-N truncation). All scene-cut.
 *   4. cuts.length < budget → keep every cut as scene-cut, then backfill the
 *      remaining slots with a uniform grid:
 *        - 0/1 cuts: grid step = durationMs / budget (uniform coverage).
 *        - >= 2 cuts: grid step = the scene-cut cadence (lower-median gap), so
 *          grid points inside cadence-sized gaps coincide with cuts and only the
 *          long static stretches (the larger uncovered gaps) get backfilled.
 *      Grid points equal to a cut are dropped; the first `remaining` survivors
 *      (ascending) are taken as "backfill".
 *   5. Merge scene-cuts + backfill, sort by tMs ascending. Output is tMs-unique
 *      and length <= budget by construction.
 */
export declare function selectFrameTimes(opts: SelectOptions): SelectedFrame[];
//# sourceMappingURL=select-frames.d.ts.map