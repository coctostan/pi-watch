import { describe, it, expect } from "vitest";
import {
	assembleWatchedFrameSet,
	mergeTranscript,
	formatTimestamp,
	selectFrameTimes,
	type AssembleInput,
} from "../../src/sampler/index.js";
import * as samplerModule from "../../src/sampler/index.js";

const { assembleTranscriptStage, attachSampledFrames } = samplerModule as unknown as {
	assembleTranscriptStage: (input: Omit<AssembleInput, "fpsSampled" | "selected" | "images" | "resolution">) => ReturnType<typeof assembleWatchedFrameSet>;
	attachSampledFrames: (
		stage: ReturnType<typeof assembleWatchedFrameSet>,
		input: Pick<AssembleInput, "fpsSampled" | "selected" | "images" | "resolution">,
	) => ReturnType<typeof assembleWatchedFrameSet>;
};
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


describe("[phase22][R3][R4][R5][R6] staged WatchedFrameSet assembly", () => {
	it("builds a contract-valid range-filtered transcript-only stage", () => {
		const stage = assembleTranscriptStage({
			ref: "range.mp4",
			durationMs: 10_000,
			range: { startMs: 4_000, endMs: 8_000 },
			transcript: [
				{ startMs: 3_000, endMs: 4_500, text: "cross start", source: "captions" },
				{ startMs: 7_500, endMs: 9_000, text: "cross end", source: "captions" },
			],
			transcriptSource: "captions",
		});

		expect(stage.frames).toEqual([]);
		expect(stage.source).toMatchObject({
			frameCount: 0,
			fpsSampled: 0,
			range: { startMs: 4_000, endMs: 8_000 },
			available: {
				frames: { count: 0, firstMs: null, lastMs: null },
				transcript: { count: 2, firstMs: 4_000, lastMs: 8_000 },
			},
		});
		expect(validateWatchedFrameSet(stage).ok).toBe(true);
	});

	it("attaches aligned frames without mutating or reprocessing the transcript stage", () => {
		const stage = assembleTranscriptStage({
			ref: "range.mp4",
			durationMs: 10_000,
			range: { startMs: 4_000, endMs: 8_000 },
			transcript: [{ startMs: 4_000, endMs: 5_000, text: "kept", source: "captions" }],
			transcriptSource: "captions",
		});
		const snapshot = structuredClone(stage);
		const selected = [
			{ tMs: 4_000, origin: "scene-cut" as const },
			{ tMs: 7_000, origin: "backfill" as const },
		];
		const frameAttachment = {
			fpsSampled: 0.5,
			selected,
			images: selected.map((_, index) => ({ imageBase64: `IMAGE_${index}`, mediaType: "image/png" as const })),
			resolution: "low" as const,
		};
		const attached = attachSampledFrames(stage, frameAttachment);

		expect(stage).toEqual(snapshot);
		expect(attached.transcript).toEqual(stage.transcript);
		expect(attached.frames.map((frame) => frame.tMs)).toEqual([4_000, 7_000]);
		expect(attached.source.available?.frames).toEqual({ count: 2, firstMs: 4_000, lastMs: 7_000 });
		expect(validateWatchedFrameSet(attached).ok).toBe(true);
		const invalidZeroFps = {
			...attached,
			source: { ...attached.source, fpsSampled: 0 },
		};
		const validation = validateWatchedFrameSet(invalidZeroFps);
		expect(validation.ok).toBe(false);
		if (!validation.ok) {
			expect(validation.errors).toContain("source.fpsSampled must be zero exactly when no frames are present.");
		}
		const invalidPositiveFpsStage = {
			...stage,
			source: { ...stage.source, fpsSampled: 1 },
		};
		expect(validateWatchedFrameSet(invalidPositiveFpsStage).ok).toBe(false);
		expect(() => attachSampledFrames(stage, { fpsSampled: 0, selected, images: [], resolution: "low" })).toThrow(/length/i);
		expect(() => attachSampledFrames(stage, { fpsSampled: 0, selected: [], images: [], resolution: "low" })).not.toThrow();
		expect(() => attachSampledFrames(stage, { fpsSampled: 1, selected: [], images: [], resolution: "low" })).toThrow(/fpsSampled/);
		expect(() => attachSampledFrames(stage, { ...frameAttachment, fpsSampled: Number.NaN })).toThrow(/finite/);
		expect(() => attachSampledFrames(stage, { ...frameAttachment, fpsSampled: Number.POSITIVE_INFINITY })).toThrow(/finite/);
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

	it("drops segments that start at or beyond the media duration", () => {
		const merged = mergeTranscript(
			[
				{ startMs: 2500, endMs: 3500, text: "crosses end", source: "captions" },
				{ startMs: 3000, endMs: 3500, text: "starts at end", source: "captions" },
				{ startMs: 4000, endMs: 5000, text: "starts after end", source: "captions" },
			],
			3000,
		);

		expect(merged).toEqual([
			{ startMs: 2500, endMs: 3000, text: "crosses end", source: "captions" },
		]);
		expect(
			validateWatchedFrameSet({
				source: {
					ref: "fixtures/rgb.mp4",
					durationMs: 3000,
					fpsSampled: 0,
					frameCount: 0,
					transcriptSource: "captions",
				},
				frames: [],
				transcript: merged,
			}).ok,
		).toBe(true);
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
				fpsSampled: 0,
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

describe("range-aware assembly", () => {
	it("clips transcript once and records fixed-size available coverage", () => {
		const selected = [
			{ tMs: 4_000, origin: "scene-cut" as const },
			{ tMs: 7_000, origin: "backfill" as const },
		];
		const input: AssembleInput = {
			ref: "range.mp4",
			durationMs: 10_000,
			range: { startMs: 4_000, endMs: 8_000 },
			fpsSampled: 0.5,
			selected,
			images: selected.map((_, index) => ({
				imageBase64: `RANGE_${index}`,
				mediaType: "image/png" as const,
			})),
			resolution: "low",
			transcript: [
				{ startMs: 3_000, endMs: 4_500, text: "cross start", source: "captions" },
				{ startMs: 7_500, endMs: 9_000, text: "cross end", source: "captions" },
			],
			transcriptSource: "captions",
		};

		const set = assembleWatchedFrameSet(input);

		expect(set.transcript).toEqual([
			{ startMs: 4_000, endMs: 4_500, text: "cross start", source: "captions" },
			{ startMs: 7_500, endMs: 8_000, text: "cross end", source: "captions" },
		]);
		expect(set.source).toMatchObject({
			range: { startMs: 4_000, endMs: 8_000 },
			available: {
				frames: { count: 2, firstMs: 4_000, lastMs: 7_000 },
				transcript: { count: 2, firstMs: 4_000, lastMs: 8_000 },
			},
		});
		expect(validateWatchedFrameSet(set).ok).toBe(true);
	});

	it("sets transcriptSource to none when range clipping removes every cue", () => {
		const merged = mergeTranscript(
			[{ startMs: 0, endMs: 1_000, text: "outside", source: "captions" }],
			10_000,
			{ startMs: 4_000, endMs: 8_000 },
		);
		expect(merged).toEqual([]);
	});
});
