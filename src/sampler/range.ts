import type { TranscriptSegment } from "../contract/index.js";
import type { SelectedFrame } from "./select-frames.js";

/** Largest whole-second value whose millisecond conversion is a safe integer. */
export const MAX_RANGE_SECONDS = Math.floor(Number.MAX_SAFE_INTEGER / 1000);
const MAX_RANGE_SECONDS_BIGINT = BigInt(MAX_RANGE_SECONDS);

export interface EvidenceRange {
	startMs: number;
	endMs: number;
}

export interface EvidenceCoverage {
	count: number;
	firstMs: number | null;
	lastMs: number | null;
}

export interface ResolveEvidenceRangeInput {
	durationMs: number;
	urlStartSeconds?: number;
	startSeconds?: number;
	endSeconds?: number;
}

function parseUnsignedSeconds(value: string): number | undefined {
	if (/^\d+$/.test(value)) {
		const seconds = BigInt(value);
		return seconds <= MAX_RANGE_SECONDS_BIGINT ? Number(seconds) : undefined;
	}

	const compact = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
	if (!compact || compact[0] === "") return undefined;
	const hours = BigInt(compact[1] ?? "0");
	const minutes = BigInt(compact[2] ?? "0");
	const seconds = BigInt(compact[3] ?? "0");
	const total = hours * 3600n + minutes * 60n + seconds;
	return total <= MAX_RANGE_SECONDS_BIGINT ? Number(total) : undefined;
}

function singletonTimestamp(params: URLSearchParams, key: "start" | "t"): number | undefined {
	const values = params.getAll(key);
	if (values.length !== 1) return undefined;
	return parseUnsignedSeconds(values[0]!);
}

/** Parse optional start-only metadata from a URL without deciding URL support. */
export function parseYouTubeStartSeconds(ref: string): number | undefined {
	let url: URL;
	try {
		url = new URL(ref);
	} catch {
		return undefined;
	}

	const startValues = url.searchParams.getAll("start");
	if (startValues.length > 0) return singletonTimestamp(url.searchParams, "start");
	return singletonTimestamp(url.searchParams, "t");
}

function explicitSeconds(name: "start" | "end", value: number | undefined): number | undefined {
	if (value === undefined) return undefined;
	if (!Number.isSafeInteger(value) || value < 0 || value > MAX_RANGE_SECONDS) {
		throw new Error(
			`Invalid watch range ${name}: expected a non-negative conversion-safe whole second integer no greater than ${MAX_RANGE_SECONDS}.`,
		);
	}
	const milliseconds = value * 1000;
	if (!Number.isSafeInteger(milliseconds)) {
		throw new Error(`Invalid watch range ${name}: millisecond conversion is not a safe integer.`);
	}
	return value;
}

/** Resolve explicit/URL bounds to one absolute half-open source range. */
export function resolveEvidenceRange(input: ResolveEvidenceRangeInput): EvidenceRange {
	if (!Number.isSafeInteger(input.durationMs) || input.durationMs < 0) {
		throw new Error("Invalid source duration for watch range resolution.");
	}
	const explicitStart = explicitSeconds("start", input.startSeconds);
	const explicitEnd = explicitSeconds("end", input.endSeconds);
	const urlStart =
		input.urlStartSeconds !== undefined &&
		Number.isSafeInteger(input.urlStartSeconds) &&
		input.urlStartSeconds >= 0 &&
		input.urlStartSeconds <= MAX_RANGE_SECONDS
			? input.urlStartSeconds
			: undefined;
	const startSeconds = explicitStart ?? urlStart ?? 0;
	if (explicitEnd !== undefined && explicitEnd <= startSeconds) {
		throw new Error("Invalid watch range: end must be greater than start.");
	}

	const startMs = startSeconds * 1000;
	if (!Number.isSafeInteger(startMs)) {
		throw new Error("Invalid watch range start: millisecond conversion is not a safe integer.");
	}
	const hasRequestedStart = explicitStart !== undefined || urlStart !== undefined;
	if (hasRequestedStart && startMs >= input.durationMs) {
		throw new Error("Invalid watch range: start must be before the probed source duration.");
	}

	const requestedEndMs = explicitEnd === undefined ? input.durationMs : explicitEnd * 1000;
	if (!Number.isSafeInteger(requestedEndMs)) {
		throw new Error("Invalid watch range end: millisecond conversion is not a safe integer.");
	}
	const endMs = Math.min(requestedEndMs, input.durationMs);
	if (endMs < startMs || (hasRequestedStart && endMs === startMs)) {
		throw new Error("Invalid watch range: effective end must be greater than start.");
	}
	return { startMs, endMs };
}

/** Keep intersecting cues, clip at range boundaries, and preserve stable ordering/text/source. */
export function clipTranscriptToRange(
	segments: readonly TranscriptSegment[],
	range: EvidenceRange,
): TranscriptSegment[] {
	return segments
		.map((segment, index) => ({ segment, index }))
		.filter(
			({ segment }) =>
				segment.text.trim().length > 0 &&
				segment.endMs > range.startMs &&
				segment.startMs < range.endMs,
		)
		.map(({ segment, index }) => ({
			segment: {
				startMs: Math.max(segment.startMs, range.startMs),
				endMs: Math.min(Math.max(segment.endMs, segment.startMs), range.endMs),
				text: segment.text,
				source: segment.source,
			},
			index,
		}))
		.filter(({ segment }) => segment.endMs > segment.startMs)
		.sort((a, b) => a.segment.startMs - b.segment.startMs || a.index - b.index)
		.map(({ segment }) => segment);
}

/** Convert absolute source cuts inside the range to range-relative offsets. */
export function sceneCutsWithinRange(
	sceneCutsMs: readonly number[],
	range: EvidenceRange,
): number[] {
	return sceneCutsMs
		.filter((offset) => offset >= range.startMs && offset < range.endMs)
		.map((offset) => offset - range.startMs);
}

/** Rebase range-relative frame decisions to absolute source offsets. */
export function rebaseSelectedFrames(
	selected: readonly SelectedFrame[],
	range: EvidenceRange,
): SelectedFrame[] {
	return selected.map((frame) => ({ ...frame, tMs: frame.tMs + range.startMs }));
}

const EMPTY_COVERAGE: EvidenceCoverage = { count: 0, firstMs: null, lastMs: null };

export function summarizeTranscriptCoverage(
	segments: readonly TranscriptSegment[],
): EvidenceCoverage {
	if (segments.length === 0) return { ...EMPTY_COVERAGE };
	return {
		count: segments.length,
		firstMs: segments[0]!.startMs,
		lastMs: segments[segments.length - 1]!.endMs,
	};
}

export function summarizeFrameCoverage(
	frames: readonly { tMs: number }[],
): EvidenceCoverage {
	if (frames.length === 0) return { ...EMPTY_COVERAGE };
	return {
		count: frames.length,
		firstMs: frames[0]!.tMs,
		lastMs: frames[frames.length - 1]!.tMs,
	};
}
