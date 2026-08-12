import { describe, expect, it } from "vitest";
import type { TranscriptSegment } from "../../src/contract/index.js";
import {
	MAX_RANGE_SECONDS,
	clipTranscriptToRange,
	parseYouTubeStartSeconds,
	rebaseSelectedFrames,
	resolveEvidenceRange,
	sceneCutsWithinRange,
	summarizeFrameCoverage,
	summarizeTranscriptCoverage,
} from "../../src/sampler/range.js";

describe("parseYouTubeStartSeconds", () => {
	const id = "dQw4w9WgXcQ";

	it.each([
		[`https://youtu.be/${id}?t=90`, 90],
		[`https://youtu.be/${id}?t=90s`, 90],
		[`https://youtube.com/watch?v=${id}&t=1h2m3s`, 3723],
		[`https://youtube.com/shorts/${id}?start=75&t=30`, 75],
		[`https://youtube.com/watch?v=${id}&start=${MAX_RANGE_SECONDS}`, MAX_RANGE_SECONDS],
	])("parses one conversion-safe supported timestamp from %s", (ref, expected) => {
		expect(parseYouTubeStartSeconds(ref)).toBe(expected);
	});

	it.each([
		`https://youtu.be/${id}`,
		`https://youtu.be/${id}?t=1m2h`,
		`https://youtu.be/${id}?t=1.5`,
		`https://youtu.be/${id}?t=-1`,
		`https://youtu.be/${id}?t=30&t=40`,
		`https://youtu.be/${id}?start=bad&t=30`,
		`https://youtu.be/${id}?t=${MAX_RANGE_SECONDS + 1}`,
		`https://youtu.be/${id}?t=999999999999999999999h59m59s`,
	])("treats malformed, ambiguous, or unsafe timestamp noise as absent for %s", (ref) => {
		expect(parseYouTubeStartSeconds(ref)).toBeUndefined();
	});
});

describe("resolveEvidenceRange", () => {
	it("uses explicit start over URL start and clamps explicit end to duration", () => {
		expect(
			resolveEvidenceRange({
				durationMs: 10_000,
				urlStartSeconds: 2,
				startSeconds: 4,
				endSeconds: 20,
			}),
		).toEqual({ startMs: 4_000, endMs: 10_000 });
	});

	it("supports URL start, end-only, and full-source defaults", () => {
		expect(resolveEvidenceRange({ durationMs: 10_000, urlStartSeconds: 3 })).toEqual({
			startMs: 3_000,
			endMs: 10_000,
		});
		expect(resolveEvidenceRange({ durationMs: 10_000, endSeconds: 4 })).toEqual({
			startMs: 0,
			endMs: 4_000,
		});
		expect(resolveEvidenceRange({ durationMs: 10_000 })).toEqual({
			startMs: 0,
			endMs: 10_000,
		});
	});

	it.each([
		{ startSeconds: -1 },
		{ startSeconds: 1.5 },
		{ startSeconds: Number.NaN },
		{ startSeconds: Number.POSITIVE_INFINITY },
		{ startSeconds: MAX_RANGE_SECONDS + 1 },
		{ startSeconds: 5, endSeconds: 5 },
		{ startSeconds: 6, endSeconds: 5 },
		{ endSeconds: -1 },
		{ endSeconds: 1.5 },
	])("rejects invalid explicit bounds %#", (bounds) => {
		expect(() => resolveEvidenceRange({ durationMs: 10_000, ...bounds })).toThrow(/range|start|end|integer|duration/i);
	});

	it("rejects an effective start at or after duration", () => {
		expect(() => resolveEvidenceRange({ durationMs: 10_000, startSeconds: 10 })).toThrow(/start.*duration/i);
		expect(() => resolveEvidenceRange({ durationMs: 10_000, urlStartSeconds: 11 })).toThrow(/start.*duration/i);
	});
});

describe("range transcript and frame transforms", () => {
	const range = { startMs: 2_000, endMs: 5_000 };

	it("clips only intersecting transcript cues on the absolute half-open range", () => {
		const segments: TranscriptSegment[] = [
			{ startMs: 5_000, endMs: 6_000, text: "at end", source: "captions" },
			{ startMs: 1_000, endMs: 2_500, text: "cross start", source: "captions" },
			{ startMs: 4_500, endMs: 6_000, text: "cross end", source: "whisper" },
			{ startMs: 3_000, endMs: 4_000, text: "inside", source: "captions" },
			{ startMs: 0, endMs: 2_000, text: "before", source: "captions" },
		];
		const before = JSON.stringify(segments);

		expect(clipTranscriptToRange(segments, range)).toEqual([
			{ startMs: 2_000, endMs: 2_500, text: "cross start", source: "captions" },
			{ startMs: 3_000, endMs: 4_000, text: "inside", source: "captions" },
			{ startMs: 4_500, endMs: 5_000, text: "cross end", source: "whisper" },
		]);
		expect(JSON.stringify(segments)).toBe(before);
	});

	it("selects cuts relative to the range then rebases selected frames absolutely", () => {
		expect(sceneCutsWithinRange([1_000, 2_000, 3_500, 5_000], range)).toEqual([0, 1_500]);
		expect(
			rebaseSelectedFrames(
				[
					{ tMs: 0, origin: "scene-cut" },
					{ tMs: 1_500, origin: "backfill" },
				],
				range,
			),
		).toEqual([
			{ tMs: 2_000, origin: "scene-cut" },
			{ tMs: 3_500, origin: "backfill" },
		]);
	});

	it("produces fixed-size transcript and frame coverage", () => {
		expect(
			summarizeTranscriptCoverage([
				{ startMs: 2_000, endMs: 2_500, text: "a", source: "captions" },
				{ startMs: 4_500, endMs: 5_000, text: "b", source: "captions" },
			]),
		).toEqual({ count: 2, firstMs: 2_000, lastMs: 5_000 });
		expect(summarizeTranscriptCoverage([])).toEqual({ count: 0, firstMs: null, lastMs: null });
		expect(
			summarizeTranscriptCoverage([
				{ startMs: 0, endMs: 10_000, text: "long", source: "captions" },
				{ startMs: 5_000, endMs: 6_000, text: "nested", source: "captions" },
			]),
		).toEqual({ count: 2, firstMs: 0, lastMs: 10_000 });
		expect(summarizeFrameCoverage([{ tMs: 2_000 }, { tMs: 3_500 }])).toEqual({
			count: 2,
			firstMs: 2_000,
			lastMs: 3_500,
		});
	});
});
