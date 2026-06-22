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

/** The complete batch outcome, including aggregate tool-result content. */
export interface BatchResult {
	items: BatchItemResult[];
	content: WatchContentPart[];
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

/** Append a text part while enforcing the aggregate text cap. */
function pushBoundedText(
	content: WatchTextPart[],
	state: { chars: number; truncated: boolean },
	value: string,
): boolean {
	if (state.truncated) return false;

	const remaining = WATCH_BATCH_MAX_TEXT_CHARS - state.chars;
	if (remaining <= 0) {
		state.truncated = true;
		return false;
	}

	if (value.length >= remaining) {
		const suffix =
			remaining > WATCH_BATCH_TRUNCATION_NOTE.length
				? WATCH_BATCH_TRUNCATION_NOTE
				: WATCH_BATCH_TRUNCATION_NOTE.slice(0, remaining);
		const sliceLength = Math.max(0, remaining - suffix.length);
		const bounded = value.slice(0, sliceLength) + suffix;
		content.push(text(bounded));
		state.chars += bounded.length;
		state.truncated = true;
		return false;
	}

	content.push(text(value));
	state.chars += value.length;
	return true;
}

/** Aggregate isolated item results into one bounded text-only tool result. */
function aggregateBatchContent(results: BatchItemResult[]): WatchContentPart[] {
	if (results.length === 0) {
		return [text("watch_batch: no videos were provided.")];
	}

	const content: WatchTextPart[] = [];
	const state = { chars: 0, truncated: false };
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
		for (const part of textParts) {
			if (!pushBoundedText(content, state, part.text)) break;
		}
	}

	return content;
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

	return { items: results, content: aggregateBatchContent(results) };
}
