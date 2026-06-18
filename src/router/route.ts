/**
 * route.ts — the pure tier-selection router (DESIGN.md §2).
 *
 * "Watching" a video = pick the cheapest path that answers the question. This
 * module is the load-bearing *decision* layer that enforces that tier discipline
 * (AGENTS.md): choose the cheapest tier that can answer, and always keep tier 3
 * (frames-into-context) as the universal terminal fallback.
 *
 * Given a question plus the post-sample availability context derived from a
 * `WatchedFrameSet`, it decides:
 *   1. the question intent ("spoken" / "visual" / "on-screen-text");
 *   2. the frame resolution ("high" only for on-screen-text / OCR questions,
 *      "low" otherwise — DESIGN §3 resolution policy);
 *   3. the ordered escalation chain of tiers to try, terminating in tier 3.
 *
 * It is fully pure: input → output, no I/O, no spawns, no Math.random, no Date,
 * no mutation of inputs. The escalation chain is expressed as the ordered list
 * the `watch` tool (Phase 5) walks; confidence-based "the answer was insufficient
 * → escalate" logic, the tier adapters themselves (Phase 6), and user-facing
 * config (Phase 7) are explicitly NOT part of this module.
 */

import type { ResolutionTier, WatchedFrameSet } from "../contract/index.js";

/** A routing tier (DESIGN §2): 1 transcript / 2 native video / 3 frames-into-context. */
export type Tier = 1 | 2 | 3;

/** What the question is fundamentally asking about — drives tier + resolution. */
export type QuestionIntent = "spoken" | "visual" | "on-screen-text";

/** Post-sample availability the tier choice depends on (derivable from a WatchedFrameSet). */
export interface RouteContext {
	/** True when a usable transcript exists (segments present AND source !== "none"). */
	hasTranscript: boolean;
}

/** The router's decision: intent, resolution policy, and the ordered tier chain. */
export interface RoutingDecision {
	intent: QuestionIntent;
	resolution: ResolutionTier;
	/** Ordered escalation chain to try; non-empty, always ends in tier 3. */
	tiers: Tier[];
	/** Convenience alias for `tiers[0]` — the first tier to attempt. */
	primaryTier: Tier;
	/** Short human-readable explanation of why this route was chosen. */
	rationale: string;
}

/**
 * On-screen-text markers — checked FIRST (highest specificity). A question can
 * contain a spoken keyword inside an on-screen phrase (e.g. "what does the sign
 * SAY"), so these must win over the spoken group.
 */
const ON_SCREEN_TEXT_MARKERS: readonly string[] = [
	"on screen",
	"on-screen",
	"onscreen",
	"text",
	"written",
	"read the",
	"what does it say",
	"what does the sign",
	"sign say",
	"label",
	"subtitle",
	"title card",
	"logo",
	"watermark",
	"ocr",
	"displayed",
	"shown on",
];

/** Spoken-content markers — checked AFTER on-screen-text. */
const SPOKEN_MARKERS: readonly string[] = [
	"say",
	"said",
	"says",
	"speak",
	"spoken",
	"mention",
	"talk",
	"discuss",
	"dialogue",
	"narrat",
	"audio",
	"hear",
	"quote",
	"word for word",
	"transcript",
	"according to",
];

function matchesAny(haystack: string, markers: readonly string[]): boolean {
	return markers.some((m) => haystack.includes(m));
}

/**
 * Classify a question into an intent + the frame resolution it implies.
 *
 * Pure and question-only (independent of any RouteContext). Precedence is
 * deliberate: on-screen-text → spoken → visual (default). On-screen-text is
 * matched first because OCR-style phrasing ("read the sign", "what does the
 * label say") often embeds spoken keywords, and the high-res path must win.
 */
export function classifyQuestion(question: string): {
	intent: QuestionIntent;
	resolution: ResolutionTier;
} {
	const q = question.toLowerCase();

	if (matchesAny(q, ON_SCREEN_TEXT_MARKERS)) {
		return { intent: "on-screen-text", resolution: "high" };
	}
	if (matchesAny(q, SPOKEN_MARKERS)) {
		return { intent: "spoken", resolution: "low" };
	}
	return { intent: "visual", resolution: "low" };
}

/**
 * Decide the route for a question given the available context.
 *
 * Deterministic tier policy (cheapest tier that works; tier 3 universal fallback):
 *   - spoken + hasTranscript      → [1, 2, 3]  (transcript answers; escalate if not)
 *   - spoken + no transcript      → [2, 3]     (tier 1 can't answer; escalate past it)
 *   - visual                      → [2, 3]     (native video, then frames)
 *   - on-screen-text              → [2, 3]     (a vision tier reads the high-res frames)
 *
 * Invariant upheld here: the returned `tiers` is non-empty and its last element
 * is always 3. Inputs are never mutated.
 */
export function route(args: {
	question: string;
	context: RouteContext;
}): RoutingDecision {
	const { intent, resolution } = classifyQuestion(args.question);
	const hasTranscript = args.context.hasTranscript;

	let tiers: Tier[];
	let rationale: string;

	if (intent === "spoken" && hasTranscript) {
		tiers = [1, 2, 3];
		rationale =
			"Spoken-content question with a transcript available → start at tier 1 (transcript), escalate to video tiers if insufficient.";
	} else if (intent === "spoken") {
		tiers = [2, 3];
		rationale =
			"Spoken-content question but no transcript available → skip tier 1; try tier 2 (native video), fall back to tier 3 (frames).";
	} else if (intent === "on-screen-text") {
		tiers = [2, 3];
		rationale =
			"On-screen-text question → high-resolution frames read by a vision tier (tier 2), fall back to tier 3 (frames-into-context).";
	} else {
		tiers = [2, 3];
		rationale =
			"Temporal/visual question → tier 2 (native video), fall back to tier 3 (frames-into-context).";
	}

	const primaryTier = tiers[0] as Tier;

	return { intent, resolution, tiers, primaryTier, rationale };
}

/**
 * Derive a `RouteContext` from the `WatchedFrameSet` the sampler produced.
 *
 * This is the seam that lets the router "route over the WatchedFrameSet sample()
 * produces" while keeping `route()` itself testable with hand-built contexts.
 * Pure: reads only, no mutation.
 */
export function routeContextFromSet(set: WatchedFrameSet): RouteContext {
	const hasTranscript =
		set.transcript.length > 0 && set.source.transcriptSource !== "none";
	return { hasTranscript };
}
