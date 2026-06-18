import { describe, it, expect } from "vitest";
import {
	validateWatchedFrameSet,
	toOpenAIContent,
	type WatchedFrameSet,
	type OpenAIImagePart,
	type OpenAITextPart,
} from "../../src/contract/index.js";

/**
 * A small, hand-built fixture mirroring the red→green→blue ordering spirit of
 * the qwen-video spike: three ordered frames + two aligned transcript segments
 * on one shared timeline. Deterministic — no model calls.
 */
function rgbFixture(): WatchedFrameSet {
	return {
		source: {
			ref: "fixtures/rgb.mp4",
			durationMs: 3000,
			fpsSampled: 1,
			frameCount: 3,
			transcriptSource: "captions",
		},
		frames: [
			{
				index: 0,
				tMs: 0,
				timestamp: "00:00",
				imageBase64: "UkVE", // "RED"
				mediaType: "image/png",
				resolution: "low",
				origin: "scene-cut",
			},
			{
				index: 1,
				tMs: 1000,
				timestamp: "00:01",
				imageBase64: "R1JFRU4=", // "GREEN"
				mediaType: "image/png",
				resolution: "low",
				origin: "scene-cut",
			},
			{
				index: 2,
				tMs: 2000,
				timestamp: "00:02",
				imageBase64: "Qkxer=", // "BLUE"-ish
				mediaType: "image/jpeg",
				resolution: "high",
				origin: "backfill",
			},
		],
		transcript: [
			{ startMs: 0, endMs: 900, text: "red", source: "captions" },
			{ startMs: 2000, endMs: 2900, text: "blue", source: "captions" },
		],
	};
}

describe("validateWatchedFrameSet", () => {
	it("accepts a well-formed frame set (AC-2, AC-4)", () => {
		const result = validateWatchedFrameSet(rgbFixture());
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.frames).toHaveLength(3);
			expect(result.value.source.frameCount).toBe(3);
		}
	});

	it("rejects frames out of timeline order", () => {
		const bad = rgbFixture();
		// frame[1] now precedes frame[0] in time while keeping array order
		bad.frames[0]!.tMs = 1000;
		bad.frames[1]!.tMs = 0;
		const result = validateWatchedFrameSet(bad);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.some((e) => e.includes("ordered by tMs"))).toBe(true);
		}
	});

	it("rejects a negative timestamp (schema minimum)", () => {
		const bad = rgbFixture();
		bad.frames[0]!.tMs = -100;
		const result = validateWatchedFrameSet(bad);
		expect(result.ok).toBe(false);
	});

	it("rejects a transcript segment with endMs < startMs", () => {
		const bad = rgbFixture();
		bad.transcript[0]!.startMs = 500;
		bad.transcript[0]!.endMs = 100;
		const result = validateWatchedFrameSet(bad);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.some((e) => e.includes("endMs"))).toBe(true);
		}
	});

	it("rejects transcript segments out of order", () => {
		const bad = rgbFixture();
		bad.transcript = [
			{ startMs: 2000, endMs: 2900, text: "blue", source: "captions" },
			{ startMs: 0, endMs: 900, text: "red", source: "captions" },
		];
		const result = validateWatchedFrameSet(bad);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.some((e) => e.includes("ordered by startMs"))).toBe(true);
		}
	});

	it("rejects frameCount that does not equal frames.length", () => {
		const bad = rgbFixture();
		bad.source.frameCount = 99;
		const result = validateWatchedFrameSet(bad);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.some((e) => e.includes("frameCount"))).toBe(true);
		}
	});

	it("rejects unknown/missing fields and wrong literals", () => {
		expect(validateWatchedFrameSet({}).ok).toBe(false);
		expect(validateWatchedFrameSet(null).ok).toBe(false);
		const badEnum: any = rgbFixture();
		badEnum.frames[0].resolution = "ultra"; // not low|high
		expect(validateWatchedFrameSet(badEnum).ok).toBe(false);
	});
});

describe("toOpenAIContent (AC-3)", () => {
	it("produces an ordered interleaved content[] in timeline order", () => {
		const parts = toOpenAIContent(rgbFixture());

		// Expected timeline (offset, frame-before-transcript on ties):
		//  0ms  frame0 label + image, then transcript "red"
		//  1000 frame1 label + image
		//  2000 frame2 label + image, then transcript "blue"
		const kinds = parts.map((p) =>
			p.type === "image_url" ? "img" : (p as OpenAITextPart).text,
		);
		expect(kinds).toEqual([
			"[00:00]",
			"img",
			"[00:00] red",
			"[00:01]",
			"img",
			"[00:02]",
			"img",
			"[00:02] blue",
		]);
	});

	it("emits image parts as valid base64 data URLs adjacent to their mm:ss label", () => {
		const parts = toOpenAIContent(rgbFixture());
		const imageParts = parts.filter(
			(p): p is OpenAIImagePart => p.type === "image_url",
		);
		expect(imageParts).toHaveLength(3);
		expect(imageParts[0]!.image_url.url).toBe("data:image/png;base64,UkVE");
		expect(imageParts[2]!.image_url.url).toBe("data:image/jpeg;base64,Qkxer=");

		// label immediately precedes image for the first frame
		expect(parts[0]).toEqual({ type: "text", text: "[00:00]" });
		expect(parts[1]!.type).toBe("image_url");
	});

	it("omits transcript when includeTranscript is false", () => {
		const parts = toOpenAIContent(rgbFixture(), { includeTranscript: false });
		const texts = parts.filter((p): p is OpenAITextPart => p.type === "text");
		expect(texts.map((t) => t.text)).toEqual(["[00:00]", "[00:01]", "[00:02]"]);
		expect(parts.filter((p) => p.type === "image_url")).toHaveLength(3);
	});

	it("prepends an optional header text part", () => {
		const parts = toOpenAIContent(rgbFixture(), { header: "Timeline:" });
		expect(parts[0]).toEqual({ type: "text", text: "Timeline:" });
	});

	it("does not mutate the input set", () => {
		const set = rgbFixture();
		const before = JSON.stringify(set);
		toOpenAIContent(set);
		expect(JSON.stringify(set)).toBe(before);
	});
});
