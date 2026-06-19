/**
 * tier-runner.ts — the pure tier-walk core for the `watch` tool (DESIGN.md §2).
 *
 * The router (Phase 4) decides an ordered escalation chain of tiers; this module
 * *walks* that chain: it tries each tier's runner in order and returns the first
 * one that produces a result. A runner returns `null` to mean "this tier is
 * unavailable / not confident → escalate to the next tier".
 *
 *   - tier 1 (transcript summarization) and tier 2 (OpenAI-compat native video)
 *     are seams — they ship here as null-returning stubs; the real adapters land
 *     in Phase 6 behind this same `TierRunner` signature.
 *   - tier 3 (frames-into-context) is fully implemented and TOTAL — it never
 *     returns null. It hands the sampled frames straight back to the orchestrator
 *     model as tool-result image parts (DESIGN §2 universal fallback, §5 Verified
 *     Fact #1: tool-result images reach the orchestrator), so it needs no external
 *     model call.
 *
 * This file is intentionally pure and pi-free: it imports the contract/router
 * shapes as TYPES only and defines a local content union mirroring pi's
 * tool-result shape, so it is unit-testable without the pi runtime or ffmpeg.
 * It consumes the routing decision as given ("route, don't answer") — no routing,
 * sampling, or OpenAI-wire serialization happens here.
 */

import type { Tier, RoutingDecision } from "../router/index.js";
import type { WatchedFrameSet } from "../contract/index.js";

// ── Tool-result content shape (mirrors pi's TextContent | ImageContent) ───────
// Defined locally so this module imports no pi package. The extension boundary
// (extension.ts) returns these parts directly as pi tool-result content.

/** A text part of tool-result content. */
export type WatchTextPart = { type: "text"; text: string };
/** An image part of tool-result content: base64 payload + its MIME type. */
export type WatchImagePart = { type: "image"; data: string; mimeType: string };
/** One part of the watch tool's tool-result content. */
export type WatchContentPart = WatchTextPart | WatchImagePart;

/** The outcome of running a single tier. */
export interface TierResult {
	tier: Tier;
	content: WatchContentPart[];
	details?: Record<string, unknown>;
}

/**
 * A tier implementation. Returns a `TierResult` when it can answer, or `null`
 * to signal "unavailable / not confident → escalate to the next tier".
 */
export type TierRunner = (args: {
	set: WatchedFrameSet;
	decision: RoutingDecision;
	question: string;
}) => TierResult | null;

/** Format a millisecond offset as mm:ss (or h:mm:ss). Pure, no deps. */
function formatMs(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const pad = (n: number): string => String(n).padStart(2, "0");
	return hours > 0
		? `${hours}:${pad(minutes)}:${pad(seconds)}`
		: `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Build the tier-3 tool-result content: the sampled frames handed back to the
 * orchestrator as image parts on a shared timeline.
 *
 * Layout:
 *   1. a leading text part stating the question, frame count, transcript source,
 *      and that tiers 1–2 were unavailable so tier 3 (frames-into-context) is used;
 *   2. for each frame (already timeline-ordered): a text part with its mm:ss
 *      timestamp + origin, immediately followed by the image part;
 *   3. when a usable transcript exists (transcriptSource !== "none" and segments
 *      present): the transcript appended as mm:ss → text lines. Omitted entirely
 *      when transcriptSource is "none".
 *
 * Pure: reads only, no mutation of inputs.
 */
export function framesToToolResultContent(
	set: WatchedFrameSet,
	question: string,
): WatchContentPart[] {
	const parts: WatchContentPart[] = [];
	const frameCount = set.frames.length;
	const transcriptSource = set.source.transcriptSource;

	parts.push({
		type: "text",
		text:
			`Question: ${question}\n` +
			`Tiers 1–2 were unavailable, so tier 3 (frames-into-context) is in use: ` +
			`${frameCount} sampled frame${frameCount === 1 ? "" : "s"} are provided below ` +
			`in timeline order (transcript source: ${transcriptSource}). ` +
			`Answer the question from these frames.`,
	});

	for (const frame of set.frames) {
		parts.push({
			type: "text",
			text: `Frame ${frame.index} @ ${frame.timestamp} (${frame.origin}):`,
		});
		parts.push({
			type: "image",
			data: frame.imageBase64,
			mimeType: frame.mediaType,
		});
	}

	if (transcriptSource !== "none" && set.transcript.length > 0) {
		const lines = set.transcript
			.map((seg) => `${formatMs(seg.startMs)} ${seg.text}`)
			.join("\n");
		parts.push({
			type: "text",
			text: `Transcript (${transcriptSource}):\n${lines}`,
		});
	}

	return parts;
}

/**
 * Tier 3 — frames-into-context. TOTAL: always returns a result (never null);
 * it is the universal terminal fallback every routing chain ends in.
 */
export const tier3Runner: TierRunner = ({ set, question }) => ({
	tier: 3,
	content: framesToToolResultContent(set, question),
	details: { tier: 3, frameCount: set.frames.length },
});

/** Tier 1 — transcript summarization adapter. Phase 6 seam; stub escalates. */
export const tier1Runner: TierRunner = () => null;

/** Tier 2 — OpenAI-compatible native video adapter. Phase 6 seam; stub escalates. */
export const tier2Runner: TierRunner = () => null;

/** Default runner table: tiers 1–2 escalating stubs, tier 3 fully implemented. */
export const defaultRunners: Record<Tier, TierRunner> = {
	1: tier1Runner,
	2: tier2Runner,
	3: tier3Runner,
};

/**
 * Walk the routing decision's ordered tier chain: call each tier's runner in
 * order and return the first non-null result ("route, don't answer" — the chain
 * comes from the router untouched).
 *
 * The router guarantees the chain is non-empty and always ends in tier 3, and
 * `tier3Runner` is total, so a result is always produced. The defensive throw
 * exists only to fail loudly if those invariants are ever violated — it never
 * silently returns empty content.
 */
export function walkTierChain(args: {
	set: WatchedFrameSet;
	decision: RoutingDecision;
	question: string;
	runners?: Record<Tier, TierRunner>;
}): TierResult {
	const { set, decision, question } = args;
	const runners = args.runners ?? defaultRunners;

	for (const tier of decision.tiers) {
		const runner = runners[tier];
		if (!runner) continue;
		const result = runner({ set, decision, question });
		if (result !== null) {
			return result;
		}
	}

	throw new Error(
		`walkTierChain: no tier produced a result for chain [${decision.tiers.join(", ")}]. ` +
			`The chain must be non-empty and end in tier 3 (a total runner).`,
	);
}
