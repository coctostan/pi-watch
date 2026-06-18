import { describe, it, expect } from "vitest";
import {
	route,
	classifyQuestion,
	routeContextFromSet,
	type Tier,
	type RouteContext,
} from "../../src/router/index.js";
import type { WatchedFrameSet } from "../../src/contract/index.js";

/**
 * Deterministic specs for the pure tier-selection router (AC-1…AC-5).
 *
 * The router is a decision unit, not an answerer — these tests assert the
 * *route* (intent, resolution, ordered tier chain), never a model answer. All
 * inputs are hand-built; no sampler/ffmpeg/model calls.
 *
 * Policy under test (DESIGN §2; cheapest tier that works, tier 3 universal fallback):
 *   - spoken + transcript      → [1, 2, 3]
 *   - spoken + no transcript   → [2, 3]
 *   - visual                   → [2, 3]
 *   - on-screen-text           → [2, 3], resolution "high"
 */

const WITH_TRANSCRIPT: RouteContext = { hasTranscript: true };
const NO_TRANSCRIPT: RouteContext = { hasTranscript: false };

describe("route — tier selection", () => {
	it("routes a spoken question WITH a transcript to tier 1 first (AC-1)", () => {
		const d = route({
			question: "What does the narrator say about the budget?",
			context: WITH_TRANSCRIPT,
		});
		expect(d.intent).toBe("spoken");
		expect(d.primaryTier).toBe(1);
		expect(d.tiers).toEqual([1, 2, 3]);
		expect(d.resolution).toBe("low");
	});

	it("escalates a spoken question with NO transcript past tier 1 (AC-2)", () => {
		const d = route({
			question: "What did they say about the weather?",
			context: NO_TRANSCRIPT,
		});
		expect(d.intent).toBe("spoken");
		expect(d.tiers).toEqual([2, 3]);
		expect(d.tiers[0]).not.toBe(1);
		expect(d.primaryTier).toBe(2);
	});

	it("routes a temporal/visual question to [2, 3] under any transcript state (AC-3)", () => {
		const q = "What color comes after red?";
		const withT = route({ question: q, context: WITH_TRANSCRIPT });
		const noT = route({ question: q, context: NO_TRANSCRIPT });

		for (const d of [withT, noT]) {
			expect(d.intent).toBe("visual");
			expect(d.tiers).toEqual([2, 3]);
			expect(d.tiers[d.tiers.length - 1]).toBe(3);
			expect(d.resolution).toBe("low");
		}
	});

	it("routes an on-screen-text question to the high-res path (AC-4)", () => {
		const d = route({
			question: "What does the sign say?",
			context: WITH_TRANSCRIPT,
		});
		expect(d.intent).toBe("on-screen-text");
		expect(d.resolution).toBe("high");
		expect(d.tiers).toEqual([2, 3]);
	});
});

describe("classifyQuestion — intent + resolution precedence", () => {
	it("classifies plain spoken questions as 'spoken' / low-res", () => {
		expect(classifyQuestion("What is being discussed?")).toEqual({
			intent: "spoken",
			resolution: "low",
		});
	});

	it("defaults non-spoken, non-text questions to 'visual' / low-res", () => {
		expect(classifyQuestion("What happens after the explosion?")).toEqual({
			intent: "visual",
			resolution: "low",
		});
	});

	it("treats on-screen-text questions as 'on-screen-text' / high-res", () => {
		expect(classifyQuestion("Read the title card")).toEqual({
			intent: "on-screen-text",
			resolution: "high",
		});
	});

	it("prefers on-screen-text over spoken when a phrase embeds both (AC-4 precedence)", () => {
		// "say" is a spoken marker, but the on-screen "sign say" phrase must win.
		expect(classifyQuestion("what does the sign say")).toEqual({
			intent: "on-screen-text",
			resolution: "high",
		});
		expect(classifyQuestion("what does the label say?")).toEqual({
			intent: "on-screen-text",
			resolution: "high",
		});
	});

	it("ignores casing (pure, lowercased internally)", () => {
		expect(classifyQuestion("WHAT DOES THE NARRATOR SAY?")).toEqual({
			intent: "spoken",
			resolution: "low",
		});
	});
});

describe("routeContextFromSet — WatchedFrameSet → RouteContext (AC-2)", () => {
	function baseSet(
		overrides: Partial<{
			transcript: WatchedFrameSet["transcript"];
			transcriptSource: WatchedFrameSet["source"]["transcriptSource"];
		}>,
	): WatchedFrameSet {
		return {
			source: {
				ref: "fixtures/clip.mp4",
				durationMs: 3000,
				fpsSampled: 1,
				frameCount: 0,
				transcriptSource: overrides.transcriptSource ?? "none",
			},
			frames: [],
			transcript: overrides.transcript ?? [],
		};
	}

	it("reports hasTranscript=false when transcript is empty and source is 'none'", () => {
		const set = baseSet({ transcript: [], transcriptSource: "none" });
		expect(routeContextFromSet(set)).toEqual({ hasTranscript: false });
	});

	it("reports hasTranscript=true when transcript segments exist with a real source", () => {
		const set = baseSet({
			transcript: [{ startMs: 0, endMs: 900, text: "hello", source: "captions" }],
			transcriptSource: "captions",
		});
		expect(routeContextFromSet(set)).toEqual({ hasTranscript: true });
	});

	it("reports hasTranscript=false when source is 'none' even if a segment slipped in", () => {
		// Guards the AND condition: source 'none' means no usable transcript.
		const set = baseSet({
			transcript: [{ startMs: 0, endMs: 900, text: "x", source: "captions" }],
			transcriptSource: "none",
		});
		expect(routeContextFromSet(set)).toEqual({ hasTranscript: false });
	});
});

describe("route — purity & invariants (AC-5)", () => {
	const cases: Array<{ question: string; context: RouteContext }> = [
		{ question: "What does the narrator say?", context: WITH_TRANSCRIPT },
		{ question: "What did she say?", context: NO_TRANSCRIPT },
		{ question: "What color comes after red?", context: WITH_TRANSCRIPT },
		{ question: "What color comes after red?", context: NO_TRANSCRIPT },
		{ question: "What does the sign say?", context: WITH_TRANSCRIPT },
		{ question: "Read the on-screen text", context: NO_TRANSCRIPT },
		{ question: "What happens next?", context: WITH_TRANSCRIPT },
	];

	it("always produces a non-empty tier chain that ends in tier 3", () => {
		for (const c of cases) {
			const d = route(c);
			expect(d.tiers.length).toBeGreaterThan(0);
			expect(d.tiers[d.tiers.length - 1]).toBe(3 satisfies Tier);
			expect(d.primaryTier).toBe(d.tiers[0]);
		}
	});

	it("is deterministic: identical inputs → identical decisions", () => {
		for (const c of cases) {
			expect(route(c)).toEqual(route(c));
		}
	});

	it("does not mutate its inputs", () => {
		const context: RouteContext = Object.freeze({ hasTranscript: true });
		const args = Object.freeze({
			question: "What does the narrator say?",
			context,
		});
		// Frozen inputs → any mutation attempt would throw in strict mode.
		expect(() => route(args)).not.toThrow();
		expect(context).toEqual({ hasTranscript: true });
	});

	it("classifyQuestion depends only on the question (context-independent)", () => {
		const q = "What does the narrator say?";
		const viaWith = route({ question: q, context: WITH_TRANSCRIPT });
		const viaNo = route({ question: q, context: NO_TRANSCRIPT });
		expect(viaWith.intent).toBe(viaNo.intent);
		expect(viaWith.resolution).toBe(viaNo.resolution);
	});
});
