import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import type { TranscriptSegment } from "../../src/contract/index.js";
import { normalizeCaptionSegments } from "../../src/sampler/captions.js";
import * as samplerEffects from "../../src/sampler/effects.js";
import {
	knownRollingOverlapPrefixes,
	rollingOverlapExpectedSegments,
	rollingOverlapMetrics,
	rollingOverlapRawSegments,
	rollingOverlapVtt,
} from "../fixtures/captions/rolling-overlap.fixture.js";


function transcriptBytes(segments: readonly TranscriptSegment[]): number {
	return Buffer.byteLength(
		segments.map((segment) => segment.text).join("\n"),
		"utf8",
	);
}

function knownDuplicateTokenCount(segments: readonly TranscriptSegment[]): number {
	return knownRollingOverlapPrefixes.reduce((total, known) => {
		const segment = segments.find((candidate) => candidate.startMs === known.startMs);
		if (!segment) return total;
		const emitted = segment.text.split(/\s+/);
		let repeated = 0;
		while (repeated < known.tokens.length && emitted[repeated] === known.tokens[repeated]) {
			repeated += 1;
		}
		return total + repeated;
	}, 0);
}

describe("normalizeCaptionSegments rolling-caption core", () => {
	it("removes only adjacent temporal overlap without mutating input segments", () => {
		const input = rollingOverlapRawSegments.map((segment) => ({ ...segment }));
		const before = structuredClone(input);

		expect(typeof normalizeCaptionSegments).toBe("function");
		expect(normalizeCaptionSegments(input)).toEqual(rollingOverlapExpectedSegments);
		expect(input).toEqual(before);
	});

	it("preserves short overlap, punctuation/case differences, separated repetition, and non-adjacent repeats", () => {
		const normalized = normalizeCaptionSegments(rollingOverlapRawSegments);

		expect(normalized.filter((segment) => segment.startMs >= 8_000)).toEqual(
			rollingOverlapExpectedSegments.filter((segment) => segment.startMs >= 8_000),
		);
	});

	it("preserves long repetitive cues beyond the bounded overlap-token budget", () => {
		const tokenCount = 128_000;
		const midpoint = tokenCount / 2;
		const previousText = new Array<string>(tokenCount).fill("repeat").join(" ");
		const currentText = [
			...new Array<string>(midpoint).fill("repeat"),
			"different",
			...new Array<string>(midpoint - 1).fill("repeat"),
		].join(" ");

		const normalized = normalizeCaptionSegments([
			{ startMs: 0, endMs: 2_000, text: previousText, source: "captions" },
			{ startMs: 1_000, endMs: 3_000, text: currentText, source: "captions" },
		]);

		expect(normalized).toHaveLength(2);
		expect(normalized[1]).toMatchObject({ startMs: 1_000, endMs: 3_000, source: "captions" });
		expect(normalized[1]?.text).toBe(currentText);
	});

	it("bounds work for a near-file-limit current cue with a three-token overlap", () => {
		const captionFileLimitBytes = 16 * 1024 * 1024;
		const currentText = "bulk ".repeat(Math.floor((14 * 1024 * 1024) / 5));
		const previous = {
			startMs: 0,
			endMs: 2_000,
			text: "bulk bulk bulk",
			source: "captions" as const,
		};
		const current = {
			startMs: 1_000,
			endMs: 3_000,
			text: currentText,
			source: "captions" as const,
		};

		const normalized = normalizeCaptionSegments([previous, current]);

		expect(Buffer.byteLength(currentText, "utf8")).toBeLessThan(captionFileLimitBytes);
		expect(normalized).toHaveLength(2);
		expect(normalized[0]).toBe(previous);
		expect(normalized[1]).toMatchObject({
			startMs: current.startMs,
			endMs: current.endMs,
			source: current.source,
		});
		expect(normalized[1]?.text).toHaveLength(currentText.length - "bulk ".repeat(3).length);
		expect(current.text).toBe(currentText);
	});
});

describe("parseWebVtt rolling-caption integration", () => {
	it("strips markup and normalizes the synthetic Unicode rolling-caption corpus", () => {
		expect(samplerEffects.parseWebVtt(rollingOverlapVtt)).toEqual(
			rollingOverlapExpectedSegments,
		);
	});

	it("preserves every expected timestamp and caption source", () => {
		const normalized = samplerEffects.parseWebVtt(rollingOverlapVtt);

		expect(normalized.map(({ startMs, endMs, source }) => ({ startMs, endMs, source }))).toEqual(
			rollingOverlapExpectedSegments.map(({ startMs, endMs, source }) => ({
				startMs,
				endMs,
				source,
			})),
		);
	});

	it("records exact corpus-scoped UTF-8 byte and duplicate-token metrics", () => {
		const normalized = samplerEffects.parseWebVtt(rollingOverlapVtt);

		expect(transcriptBytes(rollingOverlapRawSegments)).toBe(
			rollingOverlapMetrics.rawTranscriptBytes,
		);
		expect(transcriptBytes(normalized)).toBe(
			rollingOverlapMetrics.normalizedTranscriptBytes,
		);
		expect(knownDuplicateTokenCount(rollingOverlapRawSegments)).toBe(
			rollingOverlapMetrics.rawKnownDuplicateTokens,
		);
		expect(knownDuplicateTokenCount(normalized)).toBe(
			rollingOverlapMetrics.normalizedKnownDuplicateTokens,
		);
	});
});
