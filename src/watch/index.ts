/**
 * pi-watch watch module — public surface.
 *
 * The load-bearing `watch` primitive (DESIGN.md §2/§7, PROJECT.md key decision:
 * "build the watch tool as the primitive first; the command + batching wrap it").
 * Two layers, one boundary:
 *   - a pure tier-walk core (tier-runner.ts): walks the router's ordered tier
 *     chain, with tier 3 (frames-into-context) fully implemented and tiers 1–2
 *     as escalating Phase-6 seams; and
 *   - the effectful pi extension (extension.ts) that registers the `watch` tool
 *     and composes sample() → route() → walkTierChain() — re-exported as the
 *     default factory so a package `pi.extensions` entry can load it.
 */

export {
	framesToToolResultContent,
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