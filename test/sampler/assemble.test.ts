import { describe, it, expect } from "vitest";
import {
	assembleWatchedFrameSet,
	mergeTranscript,
	formatTimestamp,
	selectFrameTimes,
	type AssembleInput,
} from "../../src/sampler/index.js";
import {
	validateWatchedFrameSet,
	type TranscriptSegment,
} from "../../src/contract/index.js";

/** Two-segment caption transcript on the shared timeline. */
function captions(): TranscriptSegment[] {
	return [
		{ startMs: 0, endMs: 900, text: "red", source: "captions" },
		{ startMs: 2000, endMs: 2900, text: "blue", source: "captions" },
	];
}

describe("formatTimestamp (AC-4)", () => {
	it("formats mm:ss, switching to h:mm:ss past one hour", () => {
		expect(formatTimestamp(0)).toBe("00:00");
		expect(formatTimestamp(1000)).toBe("00:01");
		expect(formatTimestamp(2000)).toBe("00:02");
		expect(formatTimestamp(61000)).toBe("01:01");
		expect(formatTimestamp(3_600_000)).toBe("1:00:00");
		expect(formatTimestamp(3_661_000)).toBe("1:01:01");
	});
});

describe("assembleWatchedFrameSet (AC-4)", () => {
	function baseInput(overrides: Partial<AssembleInput> = {}): AssembleInput {
		const selected = selectFrameTimes({
			sceneCutsMs: [0, 1000, 2000],
			durationMs: 3000,
			budget: 16,
		});
		const images = selected.map((_, i) => ({
			imageBase64: `IMG${i}`,
			mediaType: "image/png" as const,
		}));
		return {
			ref: "fixtures/rgb.mp4",
			durationMs: 3000,
			fpsSampled: 1,
			selected,
			images,
			resolution: "low",
			transcript: captions(),
			transcriptSource: "captions",
			...overrides,
		};
	}

	it("produces a value that passes validateWatchedFrameSet", () => {
		const set = assembleWatchedFrameSet(baseInput());
		const result = validateWatchedFrameSet(set);
		expect(result.ok).toBe(true);
	});

	it("assigns sequential zero-based indices and mm:ss timestamps from tMs", () => {
		const set = assembleWatchedFrameSet(baseInput());
		expect(set.frames.map((f) => f.index)).toEqual([0, 1, 2]);
		expect(set.frames.map((f) => f.tMs)).toEqual([0, 1000, 2000]);
		expect(set.frames.map((f) => f.timestamp)).toEqual([
			"00:00",
			"00:01",
			"00:02",
		]);
		expect(set.frames.map((f) => f.origin)).toEqual([
			"scene-cut",
			"scene-cut",
			"scene-cut",
		]);
	});

	it("carries the supplied resolution tier and image payloads onto each frame", () => {
		const set = assembleWatchedFrameSet(baseInput({ resolution: "high" }));
		expect(set.frames.every((f) => f.resolution === "high")).toBe(true);
		expect(set.frames.map((f) => f.imageBase64)).toEqual([
			"IMG0",
			"IMG1",
			"IMG2",
		]);
		expect(set.frames.every((f) => f.mediaType === "image/png")).toBe(true);
	});

	it("sets source.frameCount to frames.length and reflects the transcript source", () => {
		const set = assembleWatchedFrameSet(baseInput());
		expect(set.source.frameCount).toBe(set.frames.length);
		expect(set.source.frameCount).toBe(3);
		expect(set.source.transcriptSource).toBe("captions");
		expect(set.source.ref).toBe("fixtures/rgb.mp4");
		expect(set.source.durationMs).toBe(3000);
		expect(set.source.fpsSampled).toBe(1);
	});

	it("reports transcriptSource 'none' for an empty transcript", () => {
		const set = assembleWatchedFrameSet(
			baseInput({ transcript: [], transcriptSource: "none" }),
		);
		expect(set.source.transcriptSource).toBe("none");
		expect(set.transcript).toEqual([]);
		expect(validateWatchedFrameSet(set).ok).toBe(true);
	});

	it("throws when images are not aligned 1:1 to the selected frames", () => {
		const input = baseInput();
		input.images = input.images.slice(0, 2);
		expect(() => assembleWatchedFrameSet(input)).toThrow();
	});

	it("does not mutate the input selected/images arrays (purity)", () => {
		const input = baseInput();
		const selectedBefore = JSON.stringify(input.selected);
		const imagesBefore = JSON.stringify(input.images);
		assembleWatchedFrameSet(input);
		expect(JSON.stringify(input.selected)).toBe(selectedBefore);
		expect(JSON.stringify(input.images)).toBe(imagesBefore);
	});
});

describe("mergeTranscript (AC-5)", () => {
	it("orders segments by startMs ascending", () => {
		const merged = mergeTranscript(
			[
				{ startMs: 2000, endMs: 2900, text: "blue", source: "captions" },
				{ startMs: 0, endMs: 900, text: "red", source: "captions" },
			],
			3000,
		);
		expect(merged.map((s) => s.startMs)).toEqual([0, 2000]);
		expect(merged.map((s) => s.text)).toEqual(["red", "blue"]);
	});

	it("clamps endMs to <= durationMs and >= startMs", () => {
		const merged = mergeTranscript(
			[
				{ startMs: 1000, endMs: 99999, text: "overrun", source: "whisper" },
				{ startMs: 2500, endMs: 100, text: "inverted", source: "whisper" },
			],
			3000,
		);
		const overrun = merged.find((s) => s.text === "overrun")!;
		const inverted = merged.find((s) => s.text === "inverted")!;
		expect(overrun.endMs).toBe(3000); // clamped down to duration
		expect(inverted.endMs).toBe(2500); // clamped up to startMs
		expect(merged.every((s) => s.endMs >= s.startMs)).toBe(true);
		expect(merged.every((s) => s.endMs <= 3000)).toBe(true);
	});

	it("drops empty / whitespace-only segments", () => {
		const merged = mergeTranscript(
			[
				{ startMs: 0, endMs: 500, text: "keep", source: "captions" },
				{ startMs: 600, endMs: 900, text: "", source: "captions" },
				{ startMs: 1000, endMs: 1500, text: "   ", source: "captions" },
			],
			3000,
		);
		expect(merged.map((s) => s.text)).toEqual(["keep"]);
	});

	it("preserves source and the original text content", () => {
		const merged = mergeTranscript(
			[{ startMs: 0, endMs: 500, text: "hello", source: "whisper" }],
			3000,
		);
		expect(merged[0]).toEqual({
			startMs: 0,
			endMs: 500,
			text: "hello",
			source: "whisper",
		});
	});

	it("produces transcript invariants accepted by validateWatchedFrameSet", () => {
		const merged = mergeTranscript(
			[
				{ startMs: 2000, endMs: 99999, text: "two", source: "captions" },
				{ startMs: 0, endMs: 900, text: "one", source: "captions" },
				{ startMs: 1000, endMs: 1500, text: "  ", source: "captions" },
			],
			3000,
		);
		const set = {
			source: {
				ref: "fixtures/rgb.mp4",
				durationMs: 3000,
				fpsSampled: 1,
				frameCount: 0,
				transcriptSource: "captions" as const,
			},
			frames: [],
			transcript: merged,
		};
		expect(validateWatchedFrameSet(set).ok).toBe(true);
	});

	it("does not mutate the input segments (purity)", () => {
		const input = [
			{ startMs: 2000, endMs: 99999, text: "x", source: "captions" as const },
		];
		const before = JSON.stringify(input);
		mergeTranscript(input, 3000);
		expect(JSON.stringify(input)).toBe(before);
	});
});
