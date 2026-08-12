import type { TranscriptSegment } from "../contract/index.js";

function parseWebVttTimestamp(value: string): number | null {
	const match = /^(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{3})$/.exec(value);
	if (!match) return null;

	const hours = match[1] === undefined ? 0 : Number.parseInt(match[1], 10);
	const minutes = Number.parseInt(match[2]!, 10);
	const seconds = Number.parseInt(match[3]!, 10);
	const milliseconds = Number.parseInt(match[4]!, 10);
	if (minutes >= 60 || seconds >= 60) return null;
	return ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds;
}

function parseWebVttTiming(line: string): { startMs: number; endMs: number } | null {
	const match = /^(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/.exec(line.trim());
	if (!match) return null;
	const startMs = parseWebVttTimestamp(match[1]!);
	const endMs = parseWebVttTimestamp(match[2]!);
	if (startMs === null || endMs === null || endMs < startMs) return null;
	return { startMs, endMs };
}

const WEBVTT_CHARACTER_REFERENCES: Readonly<Record<string, string>> = {
	amp: "&",
	lt: "<",
	gt: ">",
	nbsp: "\u00a0",
	lrm: "\u200e",
	rlm: "\u200f",
};

function stripWebVttMarkup(line: string): string {
	return line
		.replace(/<(?:\d+:)?\d{2}:\d{2}[.,]\d{3}>/g, "")
		.replace(/<[^>]*>/g, "")
		.replace(/&(amp|lt|gt|nbsp|lrm|rlm);/g, (_match, name: string) =>
			WEBVTT_CHARACTER_REFERENCES[name] ?? _match,
		)
		.trim();
}

const MAX_ADJACENT_OVERLAP_TOKENS = 4_096;

interface TokenPrefix {
	tokens: string[];
	starts: number[];
}

function whitespaceTokenPrefix(text: string, limit: number): TokenPrefix {
	const tokens: string[] = [];
	const starts: number[] = [];
	const pattern = /\S+/gu;
	while (tokens.length < limit) {
		const match = pattern.exec(text);
		if (match === null) break;
		tokens.push(match[0]);
		starts.push(match.index);
	}
	return { tokens, starts };
}

function longestSuffixPrefixTokenOverlap(
	previousTokens: readonly string[],
	currentTokens: readonly string[],
): number {
	const maximumOverlap = Math.min(previousTokens.length, currentTokens.length);
	if (maximumOverlap === 0) return 0;

	const fallback = new Array<number>(maximumOverlap).fill(0);
	for (let index = 1; index < maximumOverlap; index += 1) {
		let matched = fallback[index - 1]!;
		while (matched > 0 && currentTokens[index] !== currentTokens[matched]) {
			matched = fallback[matched - 1]!;
		}
		if (currentTokens[index] === currentTokens[matched]) matched += 1;
		fallback[index] = matched;
	}

	let matched = 0;
	const previousOffset = previousTokens.length - maximumOverlap;
	for (let index = previousOffset; index < previousTokens.length; index += 1) {
		const token = previousTokens[index]!;
		while (
			matched > 0 &&
			(matched === maximumOverlap || currentTokens[matched] !== token)
		) {
			matched = fallback[matched - 1]!;
		}
		if (matched < maximumOverlap && currentTokens[matched] === token) matched += 1;
	}
	return matched;
}

function withoutAdjacentOverlap(previousText: string, currentText: string): string | null {
	if (currentText === previousText) return null;

	const previousPrefix = whitespaceTokenPrefix(
		previousText,
		MAX_ADJACENT_OVERLAP_TOKENS + 1,
	);
	if (
		previousPrefix.tokens.length < 3 ||
		previousPrefix.tokens.length > MAX_ADJACENT_OVERLAP_TOKENS
	) {
		return currentText;
	}

	const currentPrefix = whitespaceTokenPrefix(currentText, previousPrefix.tokens.length + 1);
	const overlap = longestSuffixPrefixTokenOverlap(
		previousPrefix.tokens,
		currentPrefix.tokens,
	);
	if (overlap < 3) return currentText;

	const suffixStart = currentPrefix.starts[overlap];
	return suffixStart === undefined ? null : currentText.slice(suffixStart);
}

/**
 * Remove conservative rolling-caption overlap from ordered adjacent segments.
 * Timing and source fields are retained from each current raw cue, and input
 * segments are never mutated.
 */
export function normalizeCaptionSegments(
	segments: readonly TranscriptSegment[],
): TranscriptSegment[] {
	const normalized: TranscriptSegment[] = [];
	let previousRaw: TranscriptSegment | undefined;

	for (const current of segments) {
		let text: string | null = current.text;
		if (previousRaw !== undefined && current.startMs < previousRaw.endMs) {
			text = withoutAdjacentOverlap(previousRaw.text, current.text);
		}
		previousRaw = current;

		if (text === null) continue;
		normalized.push(text === current.text ? current : { ...current, text });
	}

	return normalized;
}

/** Parse and normalize WebVTT cues into stable, ordered caption segments without I/O. */
export function parseWebVtt(input: string): TranscriptSegment[] {
	const lines = input.replace(/\r\n?/g, "\n").split("\n");
	const parsed: Array<TranscriptSegment & { order: number }> = [];
	let cueOrder = 0;

	for (let i = 0; i < lines.length; ) {
		const line = lines[i]!.trim();
		if (line === "" || (i === 0 && line.startsWith("WEBVTT"))) {
			i += 1;
			continue;
		}
		if (/^(?:NOTE|STYLE|REGION)(?:\s|$)/.test(line)) {
			while (i < lines.length && lines[i]!.trim() !== "") i += 1;
			continue;
		}

		let timingIndex = i;
		if (!line.includes("-->")) timingIndex += 1;
		const timingLine = lines[timingIndex]?.trim() ?? "";
		const timing = parseWebVttTiming(timingLine);
		if (!timing) {
			while (i < lines.length && lines[i]!.trim() !== "") i += 1;
			continue;
		}

		i = timingIndex + 1;
		const payload: string[] = [];
		while (i < lines.length && lines[i]!.trim() !== "") {
			const text = stripWebVttMarkup(lines[i]!);
			if (text !== "") payload.push(text);
			i += 1;
		}
		if (payload.length > 0) {
			parsed.push({
				...timing,
				text: payload.join("\n"),
				source: "captions",
				order: cueOrder,
			});
			cueOrder += 1;
		}
	}

	const ordered = parsed
		.sort((a, b) => a.startMs - b.startMs || a.order - b.order)
		.map(({ order: _order, ...segment }) => segment);
	return normalizeCaptionSegments(ordered);
}
