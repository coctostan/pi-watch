/**
 * extension.ts — the `watch` pi custom tool (effect boundary, DESIGN.md §2/§7).
 *
 * This is the effectful seam that composes the three stable surfaces shipped in
 * Phases 2–4 into the load-bearing `watch` primitive:
 *
 *     sample()              → a validated WatchedFrameSet   (ffprobe/ffmpeg + best-effort transcript)
 *     routeContextFromSet() → RouteContext
 *     route()               → an ordered tier escalation chain (RoutingDecision)
 *     walkTierChain()       → the first available tier's TierResult (pure core)
 *
 * Activation recipe (Phase-1 FINDINGS — spikes/01-tool-activation/FINDINGS.md):
 *   1. register `watch` SYNCHRONOUSLY at the top of the factory;
 *   2. `promptSnippet` is MANDATORY (without it pi omits the tool from the
 *      model's "Available tools" prompt section);
 *   3. do NOT call pi.setActiveTools defensively — a tool governor (e.g.
 *      pi-loadout) is handled by shipping `watch` as an installed package and
 *      enabling it in the active loadout, not by code here.
 *
 * "Route, don't answer": all escalation/answer logic lives in the router + tier
 * runners; this file only wires effects to the pure core and degrades gracefully
 * on failure (a single error TextContent rather than throwing through the host).
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";

import { sample } from "../sampler/index.js";
import { route, routeContextFromSet, type Tier } from "../router/index.js";
import { resolveWatchConfig } from "../config/index.js";
import {
	walkTierChain,
	defaultRunners,
	type TierRunner,
	type WatchContentPart,
} from "./tier-runner.js";
import { createTier2Runner } from "./tier2.js";

/**
 * `watch` tool parameters (TypeBox → static type + runtime schema).
 *
 * NOTE: `resolution` uses Type.Union of literals to match the project's contract
 * convention (src/contract: ResolutionTier). If a Google-compatible provider is
 * ever targeted, migrate this to `StringEnum` from `@earendil-works/pi-ai`
 * (docs/extensions.md: Type.Union/Type.Literal is rejected by Google's API) —
 * deferred to Phase 6, when pi-ai enters for the tier-2 adapter anyway.
 */
export const WATCH_PARAMS = Type.Object({
	ref: Type.String({
		description: "Video reference: local file path or http(s) URL",
	}),
	question: Type.String({
		description: "What to find out about the video",
	}),
	budget: Type.Optional(
		Type.Integer({
			minimum: 1,
			description: "Max frames to sample (default ~16)",
		}),
	),
	resolution: Type.Optional(
		Type.Union([Type.Literal("low"), Type.Literal("high")], {
			description:
				"Optional frame-resolution override; normally the router sets this by question intent.",
		}),
	),
});

/** Static input type for the `watch` tool's `execute`. */
export type WatchInput = Static<typeof WATCH_PARAMS>;

const WATCH_DESCRIPTION =
	"Watch a video (local file or URL) and answer a question about it. Samples " +
	"frames + best-effort transcript, then routes to the cheapest tier that can " +
	"answer (transcript → native video → frames-into-context), returning the answer " +
	"and, for the frames tier, the sampled frames themselves.";

/**
 * Extension factory: registers the `watch` tool. Synchronous registration (no
 * await before `registerTool`) per the Phase-1 activation recipe.
 *
 * Config (Phase 7): the typed config surface is resolved ONCE here from the
 * environment (`resolveWatchConfig`). It supplies the tier-2 endpoint + fetch
 * timeout (used to build a config-driven tier-2 runner) and the default frame
 * budget/resolution applied under per-call `WATCH_PARAMS` overrides. Reading
 * `process.env` synchronously is fine; no await is introduced before registration.
 */
export default function watchExtension(pi: ExtensionAPI): void {
	// Resolve the typed config once (the only env read) and build a config-driven
	// runner table: tiers 1 + 3 from defaults, tier 2 from the resolved endpoint +
	// fetch timeout. Replaces the adapter's former raw process.env read.
	const config = resolveWatchConfig(process.env);
	const runners: Record<Tier, TierRunner> = {
		...defaultRunners,
		2: createTier2Runner({ config: config.tier2, timeoutMs: config.fetchTimeoutMs }),
	};

	// Pin TDetails to a shared record so the success and error branches of
	// `execute` return a single, consistent details shape (otherwise TS infers
	// TDetails from the first branch and rejects the other).
	pi.registerTool<typeof WATCH_PARAMS, Record<string, unknown>>({
		name: "watch",
		label: "Watch",
		description: WATCH_DESCRIPTION,
		// MANDATORY (Phase-1 finding): omitting this drops the tool from the prompt.
		promptSnippet:
			"Watch a video and answer a question about it using the cheapest tier that works",
		promptGuidelines: [
			"Use `watch` for visual, temporal, or spoken questions about a video file path or http(s) URL.",
			"Pass the user's actual question as `question` so the tool can route to the cheapest answering tier.",
		],
		parameters: WATCH_PARAMS,
		async execute(_toolCallId, params: WatchInput) {
			try {
				const set = await sample({
					ref: params.ref,
					budget: params.budget ?? config.budget,
					resolution: params.resolution ?? config.resolution,
				});
				const ctx = routeContextFromSet(set);
				const decision = route({ question: params.question, context: ctx });
				const result = await walkTierChain({
					set,
					decision,
					question: params.question,
					runners,
				});

				return {
					content: result.content,
					details: {
						tier: result.tier,
						intent: decision.intent,
						resolution: decision.resolution,
						tiers: decision.tiers,
						rationale: decision.rationale,
						frameCount: set.frames.length,
						transcriptSource: set.source.transcriptSource,
					},
				};
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				const errorPart: WatchContentPart = {
					type: "text",
					text: `watch failed for "${params.ref}": ${message}`,
				};
				return {
					content: [errorPart],
					details: { error: message, ref: params.ref },
					isError: true,
				};
			}
		},
	});
}
