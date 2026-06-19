import { describe, it, expect } from "vitest";
import {
	walkTierChain,
	framesToToolResultContent,
	defaultRunners,
	tier3Runner,
	type TierRunner,
	type WatchImagePart,
} from "../../src/watch/index.js";
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
 * no model calls. Tier 3 (frames-into-context) is the only implemented tier;
 * tiers 1–2 are escalating stubs.
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
