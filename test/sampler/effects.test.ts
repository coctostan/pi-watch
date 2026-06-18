import { describe, it, expect } from "vitest";
import { parseDurationMs, parseSceneCutsMs } from "../../src/sampler/index.js";

/**
 * Pure-parser unit tests for the effect layer. These spawn NOTHING — they feed
 * representative ffprobe/ffmpeg output strings (captured from the real tools)
 * straight into the exported parsers, so they are fast and deterministic.
 */

describe("parseDurationMs (AC-1)", () => {
	it("maps ffprobe seconds output to integer milliseconds", () => {
		expect(parseDurationMs("12.345\n")).toBe(12345);
		expect(parseDurationMs("3.000000\n")).toBe(3000);
		expect(parseDurationMs("0.5")).toBe(500);
	});

	it("rounds fractional milliseconds", () => {
		expect(parseDurationMs("1.2345")).toBe(1235); // 1234.5 -> 1235
	});

	it("throws on N/A or empty output", () => {
		expect(() => parseDurationMs("N/A")).toThrow();
		expect(() => parseDurationMs("")).toThrow();
		expect(() => parseDurationMs("   \n")).toThrow();
	});

	it("throws on unparseable output", () => {
		expect(() => parseDurationMs("not-a-number")).toThrow();
		expect(() => parseDurationMs("-1.0")).toThrow();
	});
});

describe("parseSceneCutsMs (AC-2)", () => {
	/** A representative ffmpeg `select=...,showinfo` stderr blob (real format). */
	const showinfo = [
		"[Parsed_showinfo_1 @ 0x87b066700] config in time_base: 1/10240, frame_rate: 10/1",
		"[Parsed_showinfo_1 @ 0x87b066700] config out time_base: 0/0, frame_rate: 0/0",
		"[Parsed_showinfo_1 @ 0x87b066700] n:   0 pts:  10240 pts_time:1       duration:1024 fmt:yuv420p s:128x128 i:P iskey:1 type:I",
		"[Parsed_showinfo_1 @ 0x87b066700] n:   1 pts:  20480 pts_time:2.05    duration:1024 fmt:yuv420p s:128x128 i:P iskey:1 type:I",
	].join("\n");

	it("extracts ascending integer ms offsets within [0, durationMs)", () => {
		expect(parseSceneCutsMs(showinfo, 3000)).toEqual([1000, 2050]);
	});

	it("drops offsets at or beyond durationMs", () => {
		// durationMs = 2000 excludes the 2.05s (2050ms) cut.
		expect(parseSceneCutsMs(showinfo, 2000)).toEqual([1000]);
	});

	it("ignores frame_rate / time_base lines that have no pts_time", () => {
		const noise = "config in time_base: 1/10240, frame_rate: 10/1\nframe_rate: 0/0";
		expect(parseSceneCutsMs(noise, 5000)).toEqual([]);
	});

	it("returns [] for empty input and de-duplicates repeated offsets", () => {
		expect(parseSceneCutsMs("", 5000)).toEqual([]);
		const dupes = "pts_time:1\npts_time:1.0\npts_time:1";
		expect(parseSceneCutsMs(dupes, 5000)).toEqual([1000]);
	});
});
