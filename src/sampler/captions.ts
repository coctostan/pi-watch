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

function whitespaceTokens(text: string): string[] {
	return text.match(/\S+/gu) ?? [];
}

function withoutAdjacentOverlap(previousText: string, currentText: string): string | null {
	if (currentText === previousText) return null;

	const previousTokens = whitespaceTokens(previousText);
	const currentTokens = whitespaceTokens(currentText);
	const maximumOverlap = Math.min(previousTokens.length, currentTokens.length);

	for (let overlap = maximumOverlap; overlap >= 3; overlap -= 1) {
		const previousOffset = previousTokens.length - overlap;
		let matches = true;
		for (let index = 0; index < overlap; index += 1) {
			if (previousTokens[previousOffset + index] !== currentTokens[index]) {
				matches = false;
				break;
			}
		}
		if (!matches) continue;

		const suffix = currentTokens.slice(overlap);
		return suffix.length === 0 ? null : suffix.join(" ");
	}

	return currentText;
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
