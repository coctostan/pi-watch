import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import type { TranscriptSegment } from "../../src/contract/index.js";
import * as samplerEffects from "../../src/sampler/effects.js";
import {
	knownRollingOverlapPrefixes,
	rollingOverlapExpectedSegments,
	rollingOverlapMetrics,
	rollingOverlapRawSegments,
	rollingOverlapVtt,
} from "../fixtures/captions/rolling-overlap.fixture.js";

type NormalizeCaptionSegments = (
	segments: readonly TranscriptSegment[],
) => TranscriptSegment[];

const normalizeCaptionSegments = (
	samplerEffects as unknown as Record<string, unknown>
).normalizeCaptionSegments as NormalizeCaptionSegments;

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
