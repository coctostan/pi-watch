import { describe, it, expect } from "vitest";
import {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
} from "@earendil-works/pi-coding-agent";
import {
	walkTierChain,
	framesToToolResultContent,
	transcriptToToolResultContent,
	defaultRunners,
	tier1Runner,
	tier3Runner,
	type TierRunner,
	type WatchImagePart,
} from "../../src/watch/index.js";
import { boundToolResultContent } from "../../src/watch/tier-runner.js";
import type { RoutingDecision } from "../../src/router/index.js";
import type {
	WatchedFrameSet,
	WatchedFrame,
	TranscriptSegment,
} from "../../src/contract/index.js";

/**
 * Deterministic specs for the pure tier-walk core (AC-1, AC-2, AC-3).
 *
 * The tier runner walks the router's ordered chain — it does not route or
 * sample. All fixtures are hand-built in memory: no ffmpeg, no sample()/route(),
 * no model calls. Tier 1 (transcript) and tier 3 (frames-into-context) are
 * implemented; tier 2 (OpenAI-compatible video) is an escalating stub.
 */

// ── Fixtures ──────────────────────────────────────────────────────────────────

function frame(overrides: Partial<WatchedFrame> = {}): WatchedFrame {
	return {
		index: 0,
		tMs: 0,
		timestamp: "00:00",
		imageBase64: "AAAA",
		mediaType: "image/png",
		resolution: "low",
		origin: "scene-cut",
		...overrides,
	};
}

function makeSet(opts: {
	frames: WatchedFrame[];
	transcript?: TranscriptSegment[];
	transcriptSource?: WatchedFrameSet["source"]["transcriptSource"];
}): WatchedFrameSet {
	const transcript = opts.transcript ?? [];
	return {
		source: {
			ref: "fixture.mp4",
			durationMs: 10_000,
			fpsSampled: 1,
			frameCount: opts.frames.length,
			transcriptSource: opts.transcriptSource ?? "none",
		},
		frames: opts.frames,
		transcript,
	};
}

function decision(tiers: RoutingDecision["tiers"]): RoutingDecision {
	return {
		intent: "visual",
		resolution: "low",
		tiers,
		primaryTier: tiers[0]!,
		rationale: "fixture",
	};
}

const TWO_FRAMES: WatchedFrame[] = [
	frame({ index: 0, tMs: 0, timestamp: "00:00", imageBase64: "FRAME0", origin: "scene-cut" }),
	frame({
		index: 1,
		tMs: 5_000,
		timestamp: "00:05",
		imageBase64: "FRAME1",
		mediaType: "image/jpeg",
		origin: "backfill",
	}),
];

// ── AC-1: walk escalates through stubs and resolves at tier 3 ─────────────────

describe("walkTierChain — escalation (AC-1)", () => {
	it("skips unavailable tiers 1–2 and returns the tier-3 result", async () => {
		const set = makeSet({ frames: TWO_FRAMES });
		const result = await walkTierChain({
			set,
			decision: decision([1, 2, 3]),
			question: "What happens?",
			runners: defaultRunners,
		});
		expect(result.tier).toBe(3);
		expect(result.content.length).toBeGreaterThan(0);
	});

	it("resolves at tier 3 for a [2, 3] chain with the default stubs", async () => {
		const set = makeSet({ frames: TWO_FRAMES });
		const result = await walkTierChain({
			set,
			decision: decision([2, 3]),
			question: "What happens?",
		});
		expect(result.tier).toBe(3);
	});

	it("rejects (never silently empty) if the chain yields no result", async () => {
		const set = makeSet({ frames: TWO_FRAMES });
		const allNull: Record<1 | 2 | 3, TierRunner> = {
			1: async () => null,
			2: async () => null,
			3: async () => null,
		};
		await expect(
			walkTierChain({
				set,
				decision: decision([2, 3]),
				question: "What happens?",
				runners: allNull,
			}),
		).rejects.toThrow(/no tier produced a result/);
	});
});

// ── AC-2: walk stops at the first available tier ──────────────────────────────

describe("walkTierChain — stops at first available tier (AC-2)", () => {
	it("returns the tier-2 result without invoking tier 3", async () => {
		const set = makeSet({ frames: TWO_FRAMES });
		let tier3Invoked = false;
		const runners: Record<1 | 2 | 3, TierRunner> = {
			1: async () => null,
			2: async () => ({ tier: 2, content: [{ type: "text", text: "tier-2 answer" }] }),
			3: (args) => {
				tier3Invoked = true;
				return tier3Runner(args);
			},
		};
		const result = await walkTierChain({
			set,
			decision: decision([2, 3]),
			question: "What happens?",
			runners,
		});
		expect(result.tier).toBe(2);
		expect(tier3Invoked).toBe(false);
		expect(result.content).toEqual([{ type: "text", text: "tier-2 answer" }]);
	});
});

// ── AC-3: tier-3 serializer hands frames to the orchestrator as ImageContent ──

describe("framesToToolResultContent — tier-3 serializer (AC-3)", () => {
	it("emits one image part per frame, in timeline order, with correct shape", () => {
		const set = makeSet({ frames: TWO_FRAMES });
		const content = framesToToolResultContent(set, "What happens, in order?");

		const images = content.filter(
			(p): p is WatchImagePart => p.type === "image",
		);
		expect(images).toHaveLength(2);
		expect(images[0]).toEqual({ type: "image", data: "FRAME0", mimeType: "image/png" });
		expect(images[1]).toEqual({ type: "image", data: "FRAME1", mimeType: "image/jpeg" });
	});

	it("leads with a text part stating the question and frame count", () => {
		const set = makeSet({ frames: TWO_FRAMES });
		const content = framesToToolResultContent(set, "What happens, in order?");
		const lead = content[0];
		expect(lead?.type).toBe("text");
		expect(lead?.type === "text" && lead.text).toContain("What happens, in order?");
		expect(lead?.type === "text" && lead.text).toContain("2");
		expect(lead?.type === "text" && lead.text.toLowerCase()).toContain("tier 3");
	});

	it("includes each frame's mm:ss timestamp as text adjacent to its image", () => {
		const set = makeSet({ frames: TWO_FRAMES });
		const content = framesToToolResultContent(set, "q");

		// Image at index i must be immediately preceded by a text part naming its timestamp.
		const idx0 = content.findIndex((p) => p.type === "image" && p.data === "FRAME0");
		const idx1 = content.findIndex((p) => p.type === "image" && p.data === "FRAME1");
		const before0 = content[idx0 - 1];
		const before1 = content[idx1 - 1];
		expect(before0?.type === "text" && before0.text).toContain("00:00");
		expect(before1?.type === "text" && before1.text).toContain("00:05");
	});

	it("includes the transcript as text when present (source !== none)", () => {
		const set = makeSet({
			frames: TWO_FRAMES,
			transcriptSource: "captions",
			transcript: [
				{ startMs: 0, endMs: 2_000, text: "hello world", source: "captions" },
				{ startMs: 5_000, endMs: 7_000, text: "second line", source: "captions" },
			],
		});
		const content = framesToToolResultContent(set, "q");
		const transcriptPart = content.find(
			(p) => p.type === "text" && p.text.includes("hello world"),
		);
		expect(transcriptPart).toBeDefined();
		expect(transcriptPart?.type === "text" && transcriptPart.text).toContain("second line");
		expect(transcriptPart?.type === "text" && transcriptPart.text).toContain("00:05");
	});

	it("omits the transcript entirely when transcriptSource is 'none'", () => {
		const set = makeSet({
			frames: TWO_FRAMES,
			transcriptSource: "none",
			// A stray segment with source none must still be omitted by the source gate.
			transcript: [{ startMs: 0, endMs: 1_000, text: "ghost", source: "captions" }],
		});
		const content = framesToToolResultContent(set, "q");
		const hasTranscriptLabel = content.some(
			(p) => p.type === "text" && p.text.startsWith("Transcript"),
		);
		expect(hasTranscriptLabel).toBe(false);
		expect(content.some((p) => p.type === "text" && p.text.includes("ghost"))).toBe(false);
	});
});

	describe("aggregate tool-result boundary", () => {
		it("keeps frame labels and images atomic when frame metadata exceeds text limits", () => {
			const frames = Array.from({ length: DEFAULT_MAX_LINES + 100 }, (_, index) =>
				frame({
					index,
					tMs: index * 1_000,
					timestamp: `00:${String(index % 60).padStart(2, "0")}`,
					imageBase64: `FRAME-${index}`,
				}),
			);
			const content = boundToolResultContent(
				framesToToolResultContent(makeSet({ frames }), "What happens?"),
			);
			const text = content
				.filter((part) => part.type === "text")
				.map((part) => part.text)
				.join("\n");
			expect(text.split("\n").length).toBeLessThanOrEqual(DEFAULT_MAX_LINES);
			expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(DEFAULT_MAX_BYTES);
			expect(text).toContain("Tool result truncated");

			const imageIndexes = content
				.map((part, index) => (part.type === "image" ? index : -1))
				.filter((index) => index >= 0);
			expect(imageIndexes.length).toBeLessThan(frames.length);
			for (const imageIndex of imageIndexes) {
				const image = content[imageIndex];
				const label = content[imageIndex - 1];
				expect(image?.type).toBe("image");
				expect(label?.type).toBe("text");
				if (image?.type !== "image" || label?.type !== "text") continue;
				const frameIndex = Number(image.data.replace("FRAME-", ""));
				expect(label.text).toBe(
					`Frame ${frameIndex} @ 00:${String(frameIndex % 60).padStart(2, "0")} (scene-cut):`,
				);
			}
		});

		it("omits a frame pair when no text lines remain for its complete label", () => {
			const lead = Array.from({ length: DEFAULT_MAX_LINES - 1 }, () => "lead").join("\n");
			const content = boundToolResultContent([
				{ type: "text", text: lead },
				{ type: "text", text: "Frame 0 @ 00:00 (scene-cut):" },
				{ type: "image", data: "FRAME-0", mimeType: "image/png" },
				{ type: "text", text: "forces overflow" },
			]);
			expect(content.some((part) => part.type === "image")).toBe(false);
			expect(
				content.some(
					(part) => part.type === "text" && part.text.includes("Frame 0 @ 00:00"),
				),
			).toBe(false);
		});

		it("omits a frame pair rather than retaining a one-byte label prefix", () => {
			const probe = boundToolResultContent([
				{ type: "text", text: "x".repeat(DEFAULT_MAX_BYTES + 1) },
			]);
			const notice = probe.find(
				(part) => part.type === "text" && part.text.includes("Tool result truncated"),
			);
			expect(notice?.type).toBe("text");
			if (notice?.type !== "text") return;
			const leadBytes = DEFAULT_MAX_BYTES - Buffer.byteLength(notice.text, "utf8") - 3;
			const longLabel = `Frame 0 @ 00:00 (scene-cut): ${"x".repeat(256)}`;
			const content = boundToolResultContent([
				{ type: "text", text: "x".repeat(leadBytes) },
				{ type: "text", text: longLabel },
				{ type: "image", data: "FRAME-0", mimeType: "image/png" },
			]);
			expect(content.some((part) => part.type === "image")).toBe(false);
			expect(
				content.some(
					(part) => part.type === "text" && part.text.includes("Frame 0 @ 00:00"),
				),
			).toBe(false);
		});
	});

// ── Phase-6 tier 1: transcript adapter ────────────────────────────────────────

describe("tier1Runner — transcript adapter", () => {
	it("escalates (returns null) when transcriptSource is 'none'", async () => {
		// A stray segment must not defeat the source gate.
		const set = makeSet({
			frames: TWO_FRAMES,
			transcriptSource: "none",
			transcript: [{ startMs: 0, endMs: 1_000, text: "ghost", source: "captions" }],
		});
		const result = await tier1Runner({
			set,
			decision: decision([1, 2, 3]),
			question: "What is said?",
		});
		expect(result).toBeNull();
	});

	it("escalates (returns null) when the transcript is empty", async () => {
		const set = makeSet({ frames: TWO_FRAMES, transcriptSource: "captions", transcript: [] });
		const result = await tier1Runner({
			set,
			decision: decision([1, 2, 3]),
			question: "What is said?",
		});
		expect(result).toBeNull();
	});

	it("answers at tier 1 from the transcript and does not invoke tiers 2/3", async () => {
		const set = makeSet({
			frames: TWO_FRAMES,
			transcriptSource: "captions",
			transcript: [
				{ startMs: 0, endMs: 2_000, text: "hello world", source: "captions" },
				{ startMs: 5_000, endMs: 7_000, text: "second line", source: "captions" },
			],
		});
		let tier2Invoked = false;
		let tier3Invoked = false;
		const runners: Record<1 | 2 | 3, TierRunner> = {
			1: tier1Runner,
			2: async () => {
				tier2Invoked = true;
				return null;
			},
			3: (args) => {
				tier3Invoked = true;
				return tier3Runner(args);
			},
		};
		const result = await walkTierChain({
			set,
			decision: decision([1, 2, 3]),
			question: "What is said?",
			runners,
		});
		expect(result.tier).toBe(1);
		expect(tier2Invoked).toBe(false);
		expect(tier3Invoked).toBe(false);
		expect(result.details).toMatchObject({ transcriptSource: "captions", segmentCount: 2 });
		// No image parts on the tier-1 path.
		expect(result.content.every((p) => p.type === "text")).toBe(true);
	});
});

describe("transcriptToToolResultContent — tier-1 serializer", () => {
	it("leads with the question and transcript source, then mm:ss-labelled lines", () => {
		const set = makeSet({
			frames: TWO_FRAMES,
			transcriptSource: "whisper",
			transcript: [
				{ startMs: 0, endMs: 2_000, text: "hello world", source: "whisper" },
				{ startMs: 65_000, endMs: 67_000, text: "second line", source: "whisper" },
			],
		});
		const content = transcriptToToolResultContent(set, "What is said?");
		const lead = content[0];
		expect(lead?.type).toBe("text");
		expect(lead?.type === "text" && lead.text).toContain("What is said?");
		expect(lead?.type === "text" && lead.text).toContain("whisper");
		// All parts are text; transcript lines carry mm:ss labels in timeline order.
		expect(content.every((p) => p.type === "text")).toBe(true);
		expect(content.some((p) => p.type === "text" && p.text === "00:00 hello world")).toBe(true);
		expect(content.some((p) => p.type === "text" && p.text === "01:05 second line")).toBe(true);
	});
});


describe("transcript truncation", () => {
	const makeTranscript = (count: number, text = "transcript line") =>
		Array.from({ length: count }, (_, index) => ({
			startMs: index * 1_000,
			endMs: (index + 1) * 1_000,
			text,
			source: "captions" as const,
		}));

	it("bounds tier-1 transcript text and reports retained lines and bytes", () => {
		const transcript = makeTranscript(DEFAULT_MAX_LINES + 500);
		const content = transcriptToToolResultContent(
			makeSet({ frames: TWO_FRAMES, transcriptSource: "captions", transcript }),
			"What is said?",
		);
		const transcriptPart = content.at(-1);
		expect(transcriptPart?.type).toBe("text");
		if (transcriptPart?.type !== "text") return;

		const allText = content
			.filter((part) => part.type === "text")
			.map((part) => part.text)
			.join("\n");
		expect(allText.split("\n").length).toBeLessThanOrEqual(DEFAULT_MAX_LINES);
		expect(Buffer.byteLength(allText, "utf8")).toBeLessThanOrEqual(DEFAULT_MAX_BYTES);
		expect(transcriptPart.text).toContain(
			`retained ${DEFAULT_MAX_LINES - 4} of ${transcript.length} lines`,
		);
		expect(transcriptPart.text).toContain("bytes");
	});

	it("bounds tier-3 transcript appendix without changing frame parts", () => {
		const transcript = makeTranscript(DEFAULT_MAX_LINES + 500);
		const content = framesToToolResultContent(
			makeSet({ frames: TWO_FRAMES, transcriptSource: "captions", transcript }),
			"What happens?",
		);
		const transcriptPart = content.find(
			(part) => part.type === "text" && part.text.startsWith("Transcript ("),
		);
		expect(transcriptPart).toBeDefined();
		expect(content.filter((part) => part.type === "image")).toHaveLength(2);
		if (transcriptPart?.type !== "text") return;

		const allText = content
			.filter((part) => part.type === "text")
			.map((part) => part.text)
			.join("\n");
		expect(allText.split("\n").length).toBeLessThanOrEqual(DEFAULT_MAX_LINES);
		expect(Buffer.byteLength(allText, "utf8")).toBeLessThanOrEqual(DEFAULT_MAX_BYTES);
		expect(transcriptPart.text).toContain(
			`retained ${DEFAULT_MAX_LINES - 7} of ${transcript.length} lines`,
		);
		expect(transcriptPart.text).toContain("bytes");
	});
});
