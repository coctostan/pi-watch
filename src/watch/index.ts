/**
 * pi-watch watch module — public surface.
 *
 * The load-bearing `watch` primitive (DESIGN.md §2/§7, PROJECT.md key decision:
 * "build the watch tool as the primitive first; the command + batching wrap it").
 * Three layers, one boundary:
 *   - a pure tier-walk core (tier-runner.ts): walks the router's ordered tier
 *     chain, with tier 1 (transcript) and tier 3 (frames-into-context)
 *     implemented as pure runners;
 *   - the tier-2 adapter (tier2.ts): the OpenAI-compatible native-video network
 *     adapter (baseURL + model id), the module's isolated network/env effect; and
 *   - the effectful pi extension (extension.ts) that registers the `watch` tool
 *     and composes sample() → route() → walkTierChain() — re-exported as the
 *     default factory so a package `pi.extensions` entry can load it.
 */

export {
	framesToToolResultContent,
	transcriptToToolResultContent,
	walkTierChain,
	tier1Runner,
	tier2Runner,
	tier3Runner,
	defaultRunners,
	type WatchTextPart,
	type WatchImagePart,
	type WatchContentPart,
	type TierResult,
	type TierRunner,
} from "./tier-runner.js";

export {
	createTier2Runner,
	buildTier2Request,
	parseTier2Answer,
	resolveTier2ConfigFromEnv,
	type Tier2Config,
} from "./tier2.js";

export {
	default as watchExtension,
	WATCH_PARAMS,
	type WatchInput,
} from "./extension.js";