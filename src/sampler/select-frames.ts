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

/** Default frame budget when the caller does not specify one (DESIGN §3, ~16). */
const DEFAULT_BUDGET = 16;

/**
 * Lower-median of the consecutive gaps between sorted cuts — the typical
 * scene-cut cadence. Robust to a single long static tail. Inputs are integers
 * and the array has >= 2 elements, so the result is a positive integer.
 */
function cadenceStep(sortedCuts: number[]): number {
	const diffs: number[] = [];
	for (let i = 1; i < sortedCuts.length; i++) {
		diffs.push(sortedCuts[i]! - sortedCuts[i - 1]!);
	}
	diffs.sort((a, b) => a - b);
	return diffs[Math.floor((diffs.length - 1) / 2)]!;
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
export function selectFrameTimes(opts: SelectOptions): SelectedFrame[] {
	const durationMs = opts.durationMs;
	const budget = Math.max(0, Math.floor(opts.budget ?? DEFAULT_BUDGET));
	if (budget === 0) return [];

	// 1. Normalize the raw cuts (new array — inputs are never mutated).
	const cuts = Array.from(
		new Set(
			opts.sceneCutsMs
				.map((c) => Math.floor(c))
				.filter((c) => Number.isFinite(c) && c >= 0 && c < durationMs),
		),
	).sort((a, b) => a - b);

	// 3. More cuts than budget → uniform subsample (preserve spread).
	if (cuts.length >= budget) {
		if (budget === 1) {
			return [{ tMs: cuts[0]!, origin: "scene-cut" }];
		}
		const n = cuts.length;
		const seenIdx = new Set<number>();
		const picks: SelectedFrame[] = [];
		for (let i = 0; i < budget; i++) {
			const idx = Math.round((i * (n - 1)) / (budget - 1));
			if (seenIdx.has(idx)) continue;
			seenIdx.add(idx);
			picks.push({ tMs: cuts[idx]!, origin: "scene-cut" });
		}
		return picks;
	}

	// 4. Fewer cuts than budget → keep all cuts, backfill the rest.
	const frames: SelectedFrame[] = cuts.map((tMs) => ({
		tMs,
		origin: "scene-cut" as const,
	}));

	const remaining = budget - cuts.length;
	if (remaining > 0 && durationMs > 0) {
		const step = cuts.length <= 1 ? durationMs / budget : cadenceStep(cuts);
		if (step > 0) {
			const seen = new Set<number>(cuts);
			const maxPoints = Math.ceil(durationMs / step) + 1; // safety bound
			const backfill: SelectedFrame[] = [];
			for (let k = 0; k < maxPoints && backfill.length < remaining; k++) {
				const t = Math.round(k * step);
				if (t >= durationMs) break;
				if (seen.has(t)) continue;
				seen.add(t);
				backfill.push({ tMs: t, origin: "backfill" });
			}
			frames.push(...backfill);
		}
	}

	// 5. Order by tMs ascending (tMs already unique across cuts + backfill).
	frames.sort((a, b) => a.tMs - b.tMs);
	return frames;
}
