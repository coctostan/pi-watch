/**
 * batch.ts — pure batching core for the `watch_batch` tool (DESIGN.md §7 step 6).
 *
 * Batching wraps the load-bearing single-video `watch` primitive rather than
 * changing it. DESIGN §5/§9 is explicit: tiers 1/2 are cheap text outputs that
 * can be fanned out in parallel; tier-3 batch (frames for many videos) needs the
 * deferred subagent fan-out. This module therefore aggregates tier-1/2 text and
 * surfaces tier-3 items as per-video `/watch` follow-ups instead of inlining many
 * videos' frames into one tool-result payload.
 *
 * Pure core / explicit effects: this file is pi-free and performs no sampling,
 * routing, network, or filesystem work. The extension boundary injects the
 * per-item sample → route → walkTierChain processor; tests inject deterministic
 * stubs.
 */

import type { Tier } from "../router/index.js";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES } from "@earendil-works/pi-coding-agent";
import type {
	AvailableEvidence,
	EvidenceCoverage,
} from "../contract/watched-frame-set.js";
import type { TierResult, WatchContentPart, WatchTextPart } from "./tier-runner.js";

/** Conservative cap for local ffmpeg/model fan-out in one batch call. */
export const WATCH_BATCH_MAX_ITEMS = 8;

/** Hard cap for aggregate text emitted by one watch_batch call. */
export const WATCH_BATCH_MAX_TEXT_CHARS = 24_000;

const WATCH_BATCH_TRUNCATION_NOTE =
	"\n\n[watch_batch output truncated; run /watch on individual items for more.]";

/** One video/question pair in a batch request. */
export interface BatchItem {
	ref: string;
	question: string;
}

/** The effectful per-item watch pipeline injected by the extension boundary. */
export type WatchItemProcessor = (item: BatchItem) => Promise<TierResult>;

/** One input item's isolated outcome. */
export interface BatchItemResult {
	index: number;
	ref: string;
	question: string;
	status: "ok" | "error";
	tier?: Tier;
	content?: WatchContentPart[];
	details?: Record<string, unknown>;
	error?: string;
}

export interface BatchEvidenceSummary {
	index: number;
	available: AvailableEvidence;
	returned: AvailableEvidence;
}

/** The complete batch outcome, including aggregate tool-result content. */
export interface BatchResult {
	items: BatchItemResult[];
	content: WatchContentPart[];
	evidence: BatchEvidenceSummary[];
	aggregateTruncated: boolean;
}

/** Build a text tool-result part. */
function text(textValue: string): WatchTextPart {
	return { type: "text", text: textValue };
}

/** Convert unknown rejection values to stable, user-visible messages. */
function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

/** Keep aggregation bounded/text-only even if a text-tier returns mixed content. */
function textPartsOnly(content: WatchContentPart[]): WatchTextPart[] {
	return content.filter((part): part is WatchTextPart => part.type === "text");
}

/** Append text while enforcing the aggregate character and Pi UTF-8 byte/line caps. */
function pushBoundedText(
	content: WatchTextPart[],
	state: { chars: number; bytes: number; lines: number; truncated: boolean },
	value: string,
): boolean {
	if (state.truncated) return false;
	const separatorBytes = content.length === 0 ? 0 : 1;
	const valueLines = value === "" ? 0 : value.split("\n").length;
	const fits =
		state.chars + value.length <= WATCH_BATCH_MAX_TEXT_CHARS &&
		state.bytes + separatorBytes + Buffer.byteLength(value, "utf8") <= DEFAULT_MAX_BYTES &&
		state.lines + valueLines <= DEFAULT_MAX_LINES;
	if (fits) {
		content.push(text(value));
		state.chars += value.length;
		state.bytes += separatorBytes + Buffer.byteLength(value, "utf8");
		state.lines += valueLines;
		return true;
	}

	const suffix = WATCH_BATCH_TRUNCATION_NOTE;
	const maxChars = Math.max(0, WATCH_BATCH_MAX_TEXT_CHARS - state.chars - suffix.length);
	const maxBytes = Math.max(
		0,
		DEFAULT_MAX_BYTES -
			state.bytes -
			separatorBytes -
			Buffer.byteLength(suffix, "utf8"),
	);
	const suffixLines = suffix.split("\n").length;
	const maxLines = Math.max(0, DEFAULT_MAX_LINES - state.lines - suffixLines + 1);
	let prefix = "";
	let chars = 0;
	let bytes = 0;
	let lines = value === "" ? 0 : 1;
	for (const char of value) {
		const charChars = char.length;
		const charBytes = Buffer.byteLength(char, "utf8");
		const nextLines = char === "\n" ? lines + 1 : lines;
		if (chars + charChars > maxChars || bytes + charBytes > maxBytes || nextLines > maxLines) {
			break;
		}
		prefix += char;
		chars += charChars;
		bytes += charBytes;
		lines = nextLines;
	}
	const bounded = prefix + suffix;
	content.push(text(bounded));
	state.chars += bounded.length;
	state.bytes += separatorBytes + Buffer.byteLength(bounded, "utf8");
	state.lines += bounded.split("\n").length;
	state.truncated = true;
	return false;
}

/** Aggregate isolated item results into one bounded text-only tool result. */
function aggregateBatchContent(results: BatchItemResult[]): {
	content: WatchContentPart[];
	truncated: boolean;
	retainedItemIndexes: Set<number>;
} {
	if (results.length === 0) {
		return {
			content: [text("watch_batch: no videos were provided.")],
			truncated: false,
			retainedItemIndexes: new Set(),
		};
	}

	const content: WatchTextPart[] = [];
	const state = { chars: 0, bytes: 0, lines: 0, truncated: false };
	const retainedItemIndexes = new Set<number>();
	pushBoundedText(
		content,
		state,
		`Watched ${results.length} video${results.length === 1 ? "" : "s"}; results below.`,
	);

	for (const item of results) {
		if (!pushBoundedText(content, state, `── [${item.index}] ${item.ref} — ${item.question}`)) {
			break;
		}
		if (item.status === "error") {
			pushBoundedText(content, state, `Error: ${item.error ?? "unknown error"}`);
			continue;
		}
		if (item.tier === 3) {
			pushBoundedText(
				content,
				state,
				`This item routed to tier 3 (frames-into-context). ` +
					`Run the single-video watch tool individually with ref: ${JSON.stringify(item.ref)} ` +
					`and question: ${JSON.stringify(item.question)} to bring its frames into context. ` +
					`Batch frame fan-out is deferred (DESIGN §5/§9).`,
			);
			continue;
		}

		const textParts = textPartsOnly(item.content ?? []);
		if (textParts.length === 0) {
			pushBoundedText(content, state, `No text content returned for tier ${item.tier ?? "unknown"}.`);
			continue;
		}
		let complete = true;
		for (const part of textParts) {
			if (!pushBoundedText(content, state, part.text)) {
				complete = false;
				break;
			}
		}
		if (complete) retainedItemIndexes.add(item.index);
	}

	return { content, truncated: state.truncated, retainedItemIndexes };
}

function emptyEvidence(): AvailableEvidence {
	const empty = (): EvidenceCoverage => ({ count: 0, firstMs: null, lastMs: null });
	return { frames: empty(), transcript: empty() };
}

function readCoverage(value: unknown): EvidenceCoverage | undefined {
	if (typeof value !== "object" || value === null) return undefined;
	const candidate = value as Record<string, unknown>;
	if (
		typeof candidate.count !== "number" ||
		(candidate.firstMs !== null && typeof candidate.firstMs !== "number") ||
		(candidate.lastMs !== null && typeof candidate.lastMs !== "number")
	) {
		return undefined;
	}
	return {
		count: candidate.count,
		firstMs: candidate.firstMs as number | null,
		lastMs: candidate.lastMs as number | null,
	};
}

function readEvidence(value: unknown): AvailableEvidence | undefined {
	if (typeof value !== "object" || value === null) return undefined;
	const candidate = value as Record<string, unknown>;
	const frames = readCoverage(candidate.frames);
	const transcript = readCoverage(candidate.transcript);
	return frames && transcript ? { frames, transcript } : undefined;
}

/**
 * Fan out over many watch items, isolate per-item failures, and aggregate a
 * bounded text-only result. Pure aside from the injected per-item processor.
 */
export async function runWatchBatch(
	items: BatchItem[],
	deps: { processItem: WatchItemProcessor },
): Promise<BatchResult> {
	if (items.length > WATCH_BATCH_MAX_ITEMS) {
		throw new Error(
			`watch_batch accepts at most ${WATCH_BATCH_MAX_ITEMS} videos per call; received ${items.length}.`,
		);
	}
	const settled = await Promise.allSettled(
		items.map((item) => Promise.resolve().then(() => deps.processItem(item))),
	);

	const results: BatchItemResult[] = settled.map((outcome, index) => {
		const item = items[index];
		if (!item) {
			throw new Error(`runWatchBatch: missing input item at index ${index}`);
		}

		if (outcome.status === "rejected") {
			return {
				index,
				ref: item.ref,
				question: item.question,
				status: "error",
				error: errorMessage(outcome.reason),
			};
		}

		return {
			index,
			ref: item.ref,
			question: item.question,
			status: "ok",
			tier: outcome.value.tier,
			content: outcome.value.content,
			details: outcome.value.details,
		};
	});

	const aggregate = aggregateBatchContent(results);
	const evidence = results.flatMap((item): BatchEvidenceSummary[] => {
		if (item.status !== "ok") return [];
		const available = readEvidence(item.details?.availableEvidence);
		if (!available) return [];
		const returned = aggregate.retainedItemIndexes.has(item.index)
			? readEvidence(item.details?.returnedEvidence) ?? emptyEvidence()
			: emptyEvidence();
		return [{ index: item.index, available, returned }];
	});
	return {
		items: results,
		content: aggregate.content,
		evidence: evidence.slice(0, WATCH_BATCH_MAX_ITEMS),
		aggregateTruncated: aggregate.truncated,
	};
}
