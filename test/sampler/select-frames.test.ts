import { describe, it, expect } from "vitest";
import { selectFrameTimes } from "../../src/sampler/index.js";

/**
 * Deterministic specs for the pure frame-selection core (AC-1, AC-2, AC-3).
 * Hand-built fixtures, no model calls. The selection rule under test:
 *   - scene cuts are kept as "scene-cut" frames;
 *   - when cuts < budget, backfill fills long static stretches relative to the
 *     scene-cut cadence (uniform fill when there are 0/1 cuts);
 *   - when cuts >= budget, cuts are uniformly subsampled (never truncated);
 *   - budget is an absolute cap; output is tMs-ascending and tMs-unique.
 */
describe("selectFrameTimes", () => {
	it("returns all scene cuts within budget, ordered, no backfill (AC-1)", () => {
		const r = selectFrameTimes({
			sceneCutsMs: [0, 1000, 2000],
			durationMs: 3000,
			budget: 16,
		});
		expect(r).toHaveLength(3);
		expect(r.map((f) => f.tMs)).toEqual([0, 1000, 2000]);
		expect(r.every((f) => f.origin === "scene-cut")).toBe(true);
	});

	it("normalizes unsorted / duplicate / out-of-range cuts (AC-1)", () => {
		const r = selectFrameTimes({
			sceneCutsMs: [2000, 0, 1000, 2000, -50, 3000],
			durationMs: 3000,
			budget: 16,
		});
		// -50 dropped (<0); 3000 dropped (== durationMs, half-open [0,3000));
		// duplicate 2000 removed; sorted ascending.
		expect(r.map((f) => f.tMs)).toEqual([0, 1000, 2000]);
		expect(r.every((f) => f.origin === "scene-cut")).toBe(true);
	});

	it("backfills uniformly when scene cuts are sparse over a long duration (AC-2)", () => {
		const r = selectFrameTimes({
			sceneCutsMs: [0],
			durationMs: 10000,
			budget: 5,
		});
		expect(r).toHaveLength(5);
		expect(r[0]).toEqual({ tMs: 0, origin: "scene-cut" });
		expect(r.slice(1).every((f) => f.origin === "backfill")).toBe(true);
		expect(r.map((f) => f.tMs)).toEqual([0, 2000, 4000, 6000, 8000]);
		// ascending, unique, in range
		const times = r.map((f) => f.tMs);
		expect(times).toEqual([...times].sort((a, b) => a - b));
		expect(new Set(times).size).toBe(times.length);
		expect(r.every((f) => f.tMs >= 0 && f.tMs < 10000)).toBe(true);
	});

	it("backfills only long static gaps relative to the scene cadence (AC-2)", () => {
		// Cuts every 2s establish a 2s cadence, then a long 8s static tail.
		// Evenly-spaced cuts => no backfill between them; only the long tail fills.
		const r = selectFrameTimes({
			sceneCutsMs: [0, 2000, 4000],
			durationMs: 12000,
			budget: 10,
		});
		expect(r.map((f) => f.tMs)).toEqual([0, 2000, 4000, 6000, 8000, 10000]);
		expect(r.map((f) => f.origin)).toEqual([
			"scene-cut",
			"scene-cut",
			"scene-cut",
			"backfill",
			"backfill",
			"backfill",
		]);
	});

	it("uniformly subsamples scene cuts when they exceed budget — not first-N (AC-3)", () => {
		const cuts = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];
		const r = selectFrameTimes({
			sceneCutsMs: cuts,
			durationMs: 10000,
			budget: 4,
		});
		expect(r).toHaveLength(4);
		expect(r.every((f) => f.origin === "scene-cut")).toBe(true);
		// indices 0,3,6,9 — uniform spread preserved, NOT the first four cuts
		expect(r.map((f) => f.tMs)).toEqual([0, 3000, 6000, 9000]);
	});

	it("never exceeds the budget for any combination (AC-3)", () => {
		for (const budget of [0, 1, 2, 3, 5, 8, 16]) {
			const r = selectFrameTimes({
				sceneCutsMs: [0, 500, 1000, 7000],
				durationMs: 8000,
				budget,
			});
			expect(r.length).toBeLessThanOrEqual(budget);
			// invariant: ascending + unique + in range, always
			const times = r.map((f) => f.tMs);
			expect(times).toEqual([...times].sort((a, b) => a - b));
			expect(new Set(times).size).toBe(times.length);
			expect(r.every((f) => f.tMs >= 0 && f.tMs < 8000)).toBe(true);
		}
	});

	it("returns [] for budget 0 (AC-3)", () => {
		expect(
			selectFrameTimes({ sceneCutsMs: [0, 1000], durationMs: 2000, budget: 0 }),
		).toEqual([]);
	});

	it("returns exactly one frame for budget 1 — the earliest cut (AC-3)", () => {
		const r = selectFrameTimes({
			sceneCutsMs: [500, 0, 1000],
			durationMs: 2000,
			budget: 1,
		});
		expect(r).toEqual([{ tMs: 0, origin: "scene-cut" }]);
	});

	it("returns a t=0 backfill for budget 1 with no cuts (AC-3)", () => {
		const r = selectFrameTimes({
			sceneCutsMs: [],
			durationMs: 5000,
			budget: 1,
		});
		expect(r).toEqual([{ tMs: 0, origin: "backfill" }]);
	});

	it("fills uniformly with backfill when there are no cuts (AC-2)", () => {
		const r = selectFrameTimes({
			sceneCutsMs: [],
			durationMs: 8000,
			budget: 4,
		});
		expect(r).toHaveLength(4);
		expect(r.every((f) => f.origin === "backfill")).toBe(true);
		expect(r.map((f) => f.tMs)).toEqual([0, 2000, 4000, 6000]);
	});

	it("uses the default budget of 16 when none is given (DESIGN §3)", () => {
		// 20 evenly-spaced cuts, default budget => capped at 16 via subsample.
		const cuts = Array.from({ length: 20 }, (_, i) => i * 1000);
		const r = selectFrameTimes({ sceneCutsMs: cuts, durationMs: 20000 });
		expect(r).toHaveLength(16);
		expect(r.every((f) => f.origin === "scene-cut")).toBe(true);
	});

	it("does not mutate the input cuts array (purity)", () => {
		const cuts = [2000, 0, 1000];
		const before = [...cuts];
		selectFrameTimes({ sceneCutsMs: cuts, durationMs: 3000, budget: 16 });
		expect(cuts).toEqual(before);
	});
});
