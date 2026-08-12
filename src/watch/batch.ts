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
	EvidenceRange,
} from "../contract/watched-frame-set.js";
import {
	boundToolResult,
	type TierResult,
	type WatchContentPart,
	type WatchTextPart,
} from "./tier-runner.js";

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
	range: EvidenceRange;
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

interface BatchTextEntry {
	part: WatchTextPart;
	itemIndex?: number;
}

interface AggregateBatchContent {
	content: WatchContentPart[];
	truncated: boolean;
	returnedByItem: Map<number, AvailableEvidence>;
	completeItemIndexes: Set<number>;
}

function contentUsage(parts: readonly WatchTextPart[]): {
	chars: number;
	bytes: number;
	lines: number;
} {
	const joined = parts.map((part) => part.text).join("\n");
	return {
		chars: parts.reduce((sum, part) => sum + part.text.length, 0),
		bytes: Buffer.byteLength(joined, "utf8"),
		lines: joined === "" ? 0 : joined.split("\n").length,
	};
}

function fitsBatchLimits(parts: readonly WatchTextPart[]): boolean {
	const usage = contentUsage(parts);
	return (
		usage.chars <= WATCH_BATCH_MAX_TEXT_CHARS &&
		usage.bytes <= DEFAULT_MAX_BYTES &&
		usage.lines <= DEFAULT_MAX_LINES
	);
}

function truncateBatchPrefix(
	value: string,
	content: readonly WatchTextPart[],
	suffix: WatchTextPart,
): string {
	const base = contentUsage(content);
	const suffixUsage = contentUsage([suffix]);
	const maxChars = Math.max(
		0,
		WATCH_BATCH_MAX_TEXT_CHARS - base.chars - suffixUsage.chars,
	);
	const separators = (content.length > 0 ? 1 : 0) + 1;
	const maxBytes = Math.max(
		0,
		DEFAULT_MAX_BYTES - base.bytes - suffixUsage.bytes - separators,
	);
	const maxLines = Math.max(0, DEFAULT_MAX_LINES - base.lines - suffixUsage.lines);
	let prefix = "";
	let chars = 0;
	let bytes = 0;
	let lines = value === "" ? 0 : 1;
	for (const char of value) {
		const nextChars = chars + char.length;
		const nextBytes = bytes + Buffer.byteLength(char, "utf8");
		const nextLines = char === "\n" ? lines + 1 : lines;
		if (nextChars > maxChars || nextBytes > maxBytes || nextLines > maxLines) break;
		prefix += char;
		chars = nextChars;
		bytes = nextBytes;
		lines = nextLines;
	}
	return prefix;
}

function batchEntries(results: BatchItemResult[]): BatchTextEntry[] {
	if (results.length === 0) return [{ part: text("watch_batch: no videos were provided.") }];
	const entries: BatchTextEntry[] = [
		{ part: text(`Watched ${results.length} video${results.length === 1 ? "" : "s"}; results below.`) },
	];
	for (const item of results) {
		entries.push({ part: text(`── [${item.index}] ${item.ref} — ${item.question}`) });
		if (item.status === "error") {
			entries.push({ part: text(`Error: ${item.error ?? "unknown error"}`) });
			continue;
		}
		if (item.tier === 3) {
			entries.push({
				part: text(
					`This item routed to tier 3 (frames-into-context). ` +
						`Run the single-video watch tool individually with ref: ${JSON.stringify(item.ref)} ` +
						`and question: ${JSON.stringify(item.question)} to bring its frames into context. ` +
						`Batch frame fan-out is deferred (DESIGN §5/§9).`,
				),
				itemIndex: item.index,
			});
			continue;
		}
		const parts = textPartsOnly(item.content ?? []);
		if (parts.length === 0) {
			entries.push({
				part: text(`No text content returned for tier ${item.tier ?? "unknown"}.`),
			});
			continue;
		}
		entries.push(...parts.map((part) => ({ part, itemIndex: item.index })));
	}
	return entries;
}

/** Aggregate item text and retain evidence markers only for content that survives. */
function aggregateBatchContent(results: BatchItemResult[]): AggregateBatchContent {
	const entries = batchEntries(results);
	const allContent = entries.map((entry) => entry.part);
	const suffix = text(WATCH_BATCH_TRUNCATION_NOTE);
	const retainedEntries: BatchTextEntry[] = [];
	let content: WatchTextPart[];
	let truncated = false;

	if (fitsBatchLimits(allContent)) {
		content = allContent;
		retainedEntries.push(...entries.filter((entry) => entry.itemIndex !== undefined));
	} else {
		truncated = true;
		content = [];
		for (const entry of entries) {
			if (fitsBatchLimits([...content, entry.part, suffix])) {
				content.push(entry.part);
				if (entry.itemIndex !== undefined) retainedEntries.push(entry);
				continue;
			}
			const evidence = boundToolResult([entry.part]).returnedEvidence;
			if (evidence.frames.count === 0 && evidence.transcript.count === 0) {
				const prefix = truncateBatchPrefix(entry.part.text, content, suffix);
				if (prefix !== "") content.push(text(prefix));
			}
			break;
		}
		content.push(suffix);
	}

	const retainedByItem = new Map<number, WatchTextPart[]>();
	for (const entry of retainedEntries) {
		if (entry.itemIndex === undefined) continue;
		const parts = retainedByItem.get(entry.itemIndex) ?? [];
		parts.push(entry.part);
		retainedByItem.set(entry.itemIndex, parts);
	}
	const totalPartsByItem = new Map<number, number>();
	for (const entry of entries) {
		if (entry.itemIndex === undefined) continue;
		totalPartsByItem.set(entry.itemIndex, (totalPartsByItem.get(entry.itemIndex) ?? 0) + 1);
	}
	const returnedByItem = new Map<number, AvailableEvidence>();
	const completeItemIndexes = new Set<number>();
	for (const [itemIndex, parts] of retainedByItem) {
		returnedByItem.set(itemIndex, boundToolResult(parts).returnedEvidence);
		if (parts.length === totalPartsByItem.get(itemIndex)) completeItemIndexes.add(itemIndex);
	}
	return { content, truncated, returnedByItem, completeItemIndexes };
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

function readRange(value: unknown): EvidenceRange | undefined {
	if (typeof value !== "object" || value === null) return undefined;
	const candidate = value as Record<string, unknown>;
	if (typeof candidate.startMs !== "number" || typeof candidate.endMs !== "number") {
		return undefined;
	}
	return { startMs: candidate.startMs, endMs: candidate.endMs };
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
		const range = readRange(item.details?.range);
		if (!range) return [];
		const marked = aggregate.returnedByItem.get(item.index) ?? emptyEvidence();
		const markedCount = marked.frames.count + marked.transcript.count;
		const returned =
			aggregate.completeItemIndexes.has(item.index) && markedCount === 0
				? readEvidence(item.details?.returnedEvidence) ?? marked
				: marked;
		return [{ index: item.index, range, available, returned }];
	});
	return {
		items: results,
		content: aggregate.content,
		evidence: evidence.slice(0, WATCH_BATCH_MAX_ITEMS),
		aggregateTruncated: aggregate.truncated,
	};
}
