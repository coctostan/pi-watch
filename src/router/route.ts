/**
 * route.ts — the pure tier-selection router (DESIGN.md §2).
 *
 * "Watching" a video = pick the cheapest path that answers the question. This
 * module is the load-bearing *decision* layer that enforces that tier discipline
 * (AGENTS.md): choose the cheapest tier that can answer, and always keep tier 3
 * (frames-into-context) as the universal terminal fallback.
 *
 * Given a question plus transcript availability from a staged or completed
 * `WatchedFrameSet`, it decides:
 *   1. the question intent (spoken / mixed / broad / visual / on-screen-text);
 *   2. the frame resolution ("high" only for on-screen-text / OCR questions,
 *      "low" otherwise — DESIGN §3 resolution policy);
 *   3. the ordered escalation chain of tiers to try, terminating in tier 3.
 *
 * It is fully pure: input → output, no I/O, no spawns, no Math.random, no Date,
 * no mutation of inputs. The `watch` tool walks the returned ordered list exactly;
 * transcript presence and question intent determine that list before tier work.
 * Tier adapters (Phase 6) and user-facing config (Phase 7) are outside this module.
 */

import type { ResolutionTier, WatchedFrameSet } from "../contract/index.js";

/** A routing tier (DESIGN §2): 1 transcript / 2 sampled-frame vision / 3 frames-into-context. */
export type Tier = 1 | 2 | 3;

/** What the question is fundamentally asking about — drives tier + resolution. */
export type QuestionIntent = "spoken" | "visual" | "mixed" | "broad" | "on-screen-text";

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
	"labels",
	"subtitle",
	"subtitles",
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
	"speaks",
	"speaker",
	"speaking",
	"spoken",
	"mention",
	"mentions",
	"mentioned",
	"mentioning",
	"talk",
	"talks",
	"talked",
	"talking",
	"discuss",
	"discusses",
	"discussed",
	"discussing",
	"discussion",
	"dialogue",
	"narrate",
	"narrates",
	"narrated",
	"narrating",
	"narration",
	"narrator",
	"audio",
	"hear",
	"heard",
	"hearing",
	"quote",
	"quotes",
	"quoted",
	"word for word",
	"transcript",
	"according to",
];


/** Explicit visual/temporal phrase markers. Unmarked questions remain broad. */
const VISUAL_TEMPORAL_MARKERS: readonly string[] = [
	"visual",
	"visually",
	"see",
	"sees",
	"saw",
	"seen",
	"seeing",
	"look",
	"looks",
	"looked",
	"looking",
	"happen",
	"happens",
	"happened",
	"happening",
	"after",
	"before",
	"next",
	"what time",
	"at what time",
	"how long",
	"duration",
	"timestamp",
	"move",
	"moves",
	"moved",
	"moving",
	"motion",
	"camera",
	"color",
	"scene",
	"appear",
	"appears",
	"appeared",
	"appearing",
	"appearance",
	"action",
	"gesture",
	"wearing",
	"doing",
];

/** Generic temporal words must match whole words to avoid broad-prompt collisions. */
const TEMPORAL_WORD_MARKERS: readonly string[] = [
	"when",
	"minute",
	"minutes",
	"second",
	"seconds",
	"start",
	"starts",
	"started",
	"starting",
	"begin",
	"begins",
	"began",
	"begun",
	"beginning",
	"end",
	"ends",
	"ended",
	"ending",
	"finish",
	"finishes",
	"finished",
	"finishing",
	"occur",
	"occurs",
	"occurred",
	"occurring",
];

function matchesAny(haystack: string, markers: readonly string[]): boolean {
	return markers.some((marker) => {
		const escaped = marker
			.split(/\s+/)
			.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
			.join("\\s+");
		return new RegExp(`(?:^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`).test(haystack);
	});
}


const EXPLICIT_TIMESTAMP_PATTERN = /\b(?:at\s+)?\d{1,2}:\d{2}(?::\d{2})?\b/;

/**
 * Classify a question into an intent + the frame resolution it implies.
 *
 * Pure and question-only (independent of any RouteContext). Precedence is
 * deliberate: on-screen-text → mixed → spoken → visual → broad. On-screen-text
 * is matched first because OCR-style phrasing ("read the sign", "what does the
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
	const hasSpokenMarker = matchesAny(q, SPOKEN_MARKERS);
	const hasVisualMarker =
		matchesAny(q, VISUAL_TEMPORAL_MARKERS) ||
		matchesAny(q, TEMPORAL_WORD_MARKERS) ||
		EXPLICIT_TIMESTAMP_PATTERN.test(q);
	if (hasSpokenMarker && hasVisualMarker) {
		return { intent: "mixed", resolution: "low" };
	}
	if (hasSpokenMarker) {
		return { intent: "spoken", resolution: "low" };
	}
	if (hasVisualMarker) {
		return { intent: "visual", resolution: "low" };
	}
	return { intent: "broad", resolution: "low" };
}

/** Local ASR is intentionally limited to explicit spoken or mixed intent. */
export function isLocalAsrEligible(intent: QuestionIntent): boolean {
	return intent === "spoken" || intent === "mixed";
}

/**
 * Decide the route for a question given the available context.
 *
 * Deterministic tier policy (cheapest tier that works; tier 3 universal fallback):
 *   - spoken / mixed / broad + transcript → [1, 2, 3]
 *   - spoken / mixed / broad + no transcript → [2, 3]
 *   - visual / on-screen-text → [2, 3] regardless of transcript availability
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

	const transcriptFirst = intent === "spoken" || intent === "mixed" || intent === "broad";
	if (transcriptFirst && hasTranscript) {
		tiers = [1, 2, 3];
		rationale =
			`${intent === "broad" ? "Broad" : intent === "mixed" ? "Mixed spoken/visual" : "Spoken-content"} question with a transcript available → deterministic transcript-presence policy starts at tier 1; sampled-frame vision tiers remain ordered fallbacks.`;
	} else if (transcriptFirst) {
		tiers = [2, 3];
		rationale =
			`${intent === "broad" ? "Broad" : intent === "mixed" ? "Mixed spoken/visual" : "Spoken-content"} question but no transcript available → skip tier 1; try tier 2 (sampled-frame vision), fall back to tier 3 (frames-into-context).`;
	} else if (intent === "on-screen-text") {
		tiers = [2, 3];
		rationale =
			"On-screen-text question → high-resolution frames read by a vision tier (tier 2), fall back to tier 3 (frames-into-context).";
	} else {
		tiers = [2, 3];
		rationale =
			"Temporal/visual question → tier 2 (sampled-frame vision), fall back to tier 3 (frames-into-context).";
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
