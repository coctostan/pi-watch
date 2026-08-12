import { describe, it, expect } from "vitest";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES } from "@earendil-works/pi-coding-agent";
import {
	runWatchBatch,
	WATCH_BATCH_MAX_TEXT_CHARS,
	type BatchItem,
	type WatchItemProcessor,
} from "../../src/watch/batch.js";
import { tier1Runner, type TierResult } from "../../src/watch/index.js";
import type { WatchedFrameSet } from "../../src/contract/index.js";
import type { Tier } from "../../src/router/index.js";

/**
 * Deterministic specs for the pure watch_batch fan-out core (AC-1, AC-2).
 *
 * All per-item processing is stubbed in memory: no sample(), no route(), no
 * walkTierChain(), no ffmpeg, and no network. The extension boundary wires the
 * real effects; this file tests the pure batching behavior directly.
 */

function makeTierResult(tier: Tier, textValue = `tier-${tier} answer`): TierResult {
	if (tier === 3) {
		return {
			tier,
			content: [
				{ type: "text", text: textValue },
				{ type: "image", data: "FRAME", mimeType: "image/png" },
			],
			details: { tier, fixture: true },
		};
	}

	return {
		tier,
		content: [{ type: "text", text: textValue }],
		details: {
			tier,
			fixture: true,
			range: { startMs: 1_000, endMs: 2_000 },
			availableEvidence: {
				frames: { count: 0, firstMs: null, lastMs: null },
				transcript: { count: 1, firstMs: 1_000, lastMs: 2_000 },
			},
			returnedEvidence: {
				frames: { count: 0, firstMs: null, lastMs: null },
				transcript: { count: 1, firstMs: 1_000, lastMs: 2_000 },
			},
		},
	};
}

function contentText(result: { content: TierResult["content"] }): string {
	return result.content
		.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join("\n");
}

function resolverAt(
	resolvers: Array<(result: TierResult) => void>,
	index: number,
): (result: TierResult) => void {
	const resolver = resolvers[index];
	if (!resolver) throw new Error(`missing resolver at index ${index}`);
	return resolver;
}

const ITEMS: BatchItem[] = [
	{ ref: "a.mp4", question: "What is said?" },
	{ ref: "b.mp4", question: "What color appears?" },
	{ ref: "c.mp4", question: "What happens last?" },
];

// ── AC-1: parallel fan-out + per-item error isolation ─────────────────────────

describe("runWatchBatch — fan-out and isolation (AC-1)", () => {
	it("starts every item concurrently and preserves input order/index", async () => {
		const started: string[] = [];
		const resolvers: Array<(result: TierResult) => void> = [];
		const processItem: WatchItemProcessor = async (item) => {
			started.push(item.ref);
			return new Promise<TierResult>((resolve) => {
				resolvers.push(resolve);
			});
		};

		const pending = runWatchBatch(ITEMS, { processItem });
		await Promise.resolve();

		// If processing were sequential, only the first unresolved item would start.
		expect(started).toEqual(["a.mp4", "b.mp4", "c.mp4"]);

		// Resolve out of order; Promise.allSettled must still preserve input order.
		resolverAt(resolvers, 2)(makeTierResult(1, "third"));
		resolverAt(resolvers, 1)(makeTierResult(2, "second"));
		resolverAt(resolvers, 0)(makeTierResult(1, "first"));

		const result = await pending;
		expect(result.items.map((item) => item.index)).toEqual([0, 1, 2]);
		expect(result.items.map((item) => item.ref)).toEqual(["a.mp4", "b.mp4", "c.mp4"]);
		expect(result.items.map((item) => item.status)).toEqual(["ok", "ok", "ok"]);
		expect(result.items.map((item) => item.tier)).toEqual([1, 2, 1]);
	});

	it("turns one rejected item into an error result without aborting the batch", async () => {
		const processItem: WatchItemProcessor = async (item) => {
			if (item.ref === "b.mp4") {
				throw new Error("decode failed");
			}
			return makeTierResult(1, `${item.ref} ok`);
		};

		const result = await runWatchBatch(ITEMS, { processItem });

		expect(result.items.map((item) => item.status)).toEqual(["ok", "error", "ok"]);
		expect(result.items[1]?.error).toBe("decode failed");
		expect(contentText(result)).toContain("a.mp4 ok");
		expect(contentText(result)).toContain("Error: decode failed");
		expect(contentText(result)).toContain("c.mp4 ok");
	});


	it("isolates synchronous processor throws the same as async rejections", async () => {
		const processItem: WatchItemProcessor = (item) => {
			if (item.ref === "b.mp4") {
				throw new Error("sync failure");
			}
			return Promise.resolve(makeTierResult(1, `${item.ref} ok`));
		};

		const result = await runWatchBatch(ITEMS, { processItem });

		expect(result.items.map((item) => item.status)).toEqual(["ok", "error", "ok"]);
		expect(result.items[1]?.error).toBe("sync failure");
		expect(contentText(result)).toContain("a.mp4 ok");
		expect(contentText(result)).toContain("Error: sync failure");
		expect(contentText(result)).toContain("c.mp4 ok");
	});
});

// ── AC-2: bounded text aggregation + tier-3 batch deferral ────────────────────

describe("runWatchBatch — aggregate content (AC-2)", () => {
	it("aggregates tier-1 and tier-2 text answers under item sections", async () => {
		const processItem: WatchItemProcessor = async (item) =>
			item.ref === "a.mp4"
				? makeTierResult(1, "transcript answer")
				: makeTierResult(2, "native-video answer");

		const result = await runWatchBatch(ITEMS.slice(0, 2), { processItem });
		const text = contentText(result);

		expect(text).toContain("Watched 2 videos; results below.");
		expect(text).toContain("── [0] a.mp4 — What is said?");
		expect(text).toContain("transcript answer");
		expect(text).toContain("── [1] b.mp4 — What color appears?");
		expect(text).toContain("native-video answer");
	});

	it("defers tier-3 items to individual single-video watch calls instead of inlining frame images", async () => {
		const processItem: WatchItemProcessor = async () =>
			makeTierResult(3, "frames would have appeared here");

		const result = await runWatchBatch([ITEMS[0]!], { processItem });
		const text = contentText(result);

		expect(result.content.every((part) => part.type === "text")).toBe(true);
		expect(text).toContain("tier 3 (frames-into-context)");
		expect(text).toContain('ref: "a.mp4"');
		expect(text).toContain('question: "What is said?"');
		expect(text).toContain("Batch frame fan-out is deferred");
		expect(text).not.toContain("frames would have appeared here");
	});

	it("aggregates mixed tier-1, tier-2, tier-3, and error outcomes", async () => {
		const items: BatchItem[] = [
			{ ref: "t1.mp4", question: "speech?" },
			{ ref: "t2.mp4", question: "visual?" },
			{ ref: "t3.mp4", question: "frames?" },
			{ ref: "bad.mp4", question: "broken?" },
		];
		const processItem: WatchItemProcessor = async (item) => {
			if (item.ref === "t1.mp4") return makeTierResult(1, "tier one text");
			if (item.ref === "t2.mp4") return makeTierResult(2, "tier two text");
			if (item.ref === "t3.mp4") return makeTierResult(3, "tier three image content");
			throw "bad fixture";
		};

		const result = await runWatchBatch(items, { processItem });
		const text = contentText(result);

		expect(result.items.map((item) => item.status)).toEqual(["ok", "ok", "ok", "error"]);
		expect(result.content.every((part) => part.type === "text")).toBe(true);
		expect(text).toContain("tier one text");
		expect(text).toContain("tier two text");
		expect(text).toContain('ref: "t3.mp4"');
		expect(text).toContain('question: "frames?"');
		expect(text).not.toContain("tier three image content");
		expect(text).toContain("Error: bad fixture");
	});


	it("caps aggregate text output and adds a truncation note", async () => {
		const oversized = `${"a".repeat(WATCH_BATCH_MAX_TEXT_CHARS + 1_000)}TAIL-SHOULD-NOT-APPEAR`;
		const processItem: WatchItemProcessor = async () => makeTierResult(2, oversized);

		const result = await runWatchBatch([ITEMS[0]!], { processItem });
		const rawTextLength = result.content.reduce(
			(sum, part) => sum + (part.type === "text" ? part.text.length : 0),
			0,
		);
		const text = contentText(result);

		expect(rawTextLength).toBeLessThanOrEqual(WATCH_BATCH_MAX_TEXT_CHARS);
		expect(text).toContain("watch_batch output truncated");
		expect(text).not.toContain("TAIL-SHOULD-NOT-APPEAR");
	});

	it("returns a graceful single-text result for an empty batch", async () => {
		const processItem: WatchItemProcessor = async () => makeTierResult(1, "unused");

		const result = await runWatchBatch([], { processItem });

		expect(result.items).toEqual([]);
		expect(result.content).toEqual([{ type: "text", text: "watch_batch: no videos were provided." }]);
	});
});

describe("runWatchBatch — range evidence and both aggregate bounds", () => {
	it.each([
		["byte", "界".repeat(WATCH_BATCH_MAX_TEXT_CHARS), DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES],
		["line", "line\n".repeat(DEFAULT_MAX_LINES + 500), DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES],
	])("bounds multibyte or multiline %s output under Pi limits", async (_name, oversized, maxBytes, maxLines) => {
		const result = await runWatchBatch([ITEMS[0]!], {
			processItem: async () => makeTierResult(1, oversized as string),
		});
		const text = contentText(result);
		expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(maxBytes as number);
		expect(text.split("\n").length).toBeLessThanOrEqual(maxLines as number);
		expect(result.aggregateTruncated).toBe(true);
	});

	it("retains at most eight fixed-size private available/returned summaries", async () => {
		const items = Array.from({ length: 8 }, (_, index) => ({
			ref: `private-${index}.mp4`,
			question: `synthetic question ${index}`,
		}));
		const result = await runWatchBatch(items, {
			processItem: async () => makeTierResult(1, "short"),
		});

		expect(result.evidence).toHaveLength(8);
		expect(result.evidence[0]).toEqual({
			index: 0,
			range: { startMs: 1_000, endMs: 2_000 },
			available: {
				frames: { count: 0, firstMs: null, lastMs: null },
				transcript: { count: 1, firstMs: 1_000, lastMs: 2_000 },
			},
			returned: {
				frames: { count: 0, firstMs: null, lastMs: null },
				transcript: { count: 1, firstMs: 1_000, lastMs: 2_000 },
			},
		});
		expect(JSON.stringify(result.evidence)).not.toMatch(/private-|synthetic question|short/);
	});

	it("reserves truncation notice capacity across multiple near-limit parts", async () => {
		const result = await runWatchBatch([ITEMS[0]!], {
			processItem: async () => ({
				tier: 2,
				content: [
					{ type: "text", text: "a".repeat(WATCH_BATCH_MAX_TEXT_CHARS - 100) },
					{ type: "text", text: "b".repeat(500) },
				],
			}),
		});
		const text = contentText(result);
		const rawChars = result.content.reduce(
			(sum, part) => sum + (part.type === "text" ? part.text.length : 0),
			0,
		);
		expect(rawChars).toBeLessThanOrEqual(WATCH_BATCH_MAX_TEXT_CHARS);
		expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(DEFAULT_MAX_BYTES);
		expect(text.split("\n").length).toBeLessThanOrEqual(DEFAULT_MAX_LINES);
		expect(text).toContain("watch_batch output truncated");
	});

	it("reports the exact visible transcript prefix for a partially retained item", async () => {
		const transcript = Array.from({ length: 1_500 }, (_, index) => ({
			startMs: index * 1_000,
			endMs: (index + 1) * 1_000,
			text: `segment ${index}`,
			source: "captions" as const,
		}));
		const set: WatchedFrameSet = {
			source: {
				ref: "private.mp4",
				durationMs: 1_500_000,
				fpsSampled: 1,
				frameCount: 0,
				transcriptSource: "captions",
				range: { startMs: 0, endMs: 1_500_000 },
				available: {
					frames: { count: 0, firstMs: null, lastMs: null },
					transcript: { count: 1_500, firstMs: 0, lastMs: 1_500_000 },
				},
			},
			frames: [],
			transcript,
		};
		const result = await runWatchBatch([{ ref: "private.mp4", question: "speech?" }], {
			processItem: async () => {
				const tierResult = await tier1Runner({
					set,
					question: "speech?",
					decision: {
						intent: "spoken",
						resolution: "low",
						tiers: [1, 2, 3],
						primaryTier: 1,
						rationale: "fixture",
					},
				});
				return {
					...tierResult!,
					details: { ...tierResult!.details, range: set.source.range },
				};
			},
		});
		const returned = result.evidence[0]!.returned.transcript;
		const rendered = contentText(result);
		expect(returned.count).toBeGreaterThan(0);
		expect(returned.count).toBeLessThan(transcript.length);
		expect(returned.firstMs).toBe(0);
		expect(returned.lastMs).toBe(transcript[returned.count - 1]!.endMs);
		expect(rendered).toContain("00:00 segment 0");
		expect(rendered).not.toContain("24:59 segment 1499");
	});

	it("does not claim a partially bounded multiline segment as returned batch evidence", async () => {
		const multiline = Array.from({ length: DEFAULT_MAX_LINES + 500 }, () => "multiline").join("\n");
		const set: WatchedFrameSet = {
			source: {
				ref: "private.mp4",
				durationMs: 2_000,
				fpsSampled: 1,
				frameCount: 0,
				transcriptSource: "captions",
				range: { startMs: 0, endMs: 2_000 },
				available: {
					frames: { count: 0, firstMs: null, lastMs: null },
					transcript: { count: 2, firstMs: 0, lastMs: 2_000 },
				},
			},
			frames: [],
			transcript: [
				{ startMs: 0, endMs: 1_000, text: multiline, source: "captions" },
				{ startMs: 1_000, endMs: 2_000, text: "must be omitted", source: "captions" },
			],
		};
		const result = await runWatchBatch([{ ref: "private.mp4", question: "speech?" }], {
			processItem: async () => {
				const tierResult = await tier1Runner({
					set,
					question: "speech?",
					decision: {
						intent: "spoken",
						resolution: "low",
						tiers: [1, 2, 3],
						primaryTier: 1,
						rationale: "fixture",
					},
				});
				return {
					...tierResult!,
					details: { ...tierResult!.details, range: set.source.range },
				};
			},
		});

		expect(result.evidence[0]!.returned.transcript).toEqual({
			count: 0,
			firstMs: null,
			lastMs: null,
		});
		expect(contentText(result)).not.toContain("must be omitted");
	});
});
