/**
 * pi-watch router — public surface.
 *
 * The pure tier-selection layer (DESIGN.md §2): given a question + the
 * availability context derived from a `WatchedFrameSet`, decide the intent, the
 * frame resolution, and the ordered escalation chain of tiers (always ending in
 * tier 3, the universal fallback). No model calls, no I/O — the router returns a
 * *decision*; the `watch` tool (Phase 5) and tier adapters (Phase 6) consume it.
 */

export {
	route,
	classifyQuestion,
	routeContextFromSet,
	type Tier,
	type QuestionIntent,
	type RouteContext,
	type RoutingDecision,
} from "./route.js";
