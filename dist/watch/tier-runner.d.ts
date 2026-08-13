/**
 * tier-runner.ts — the pure tier-walk core for the `watch` tool (DESIGN.md §2).
 *
 * The router (Phase 4) decides an ordered escalation chain of tiers; this module
 * *walks* that chain: it tries each tier's runner in order and returns the first
 * one that produces a result. A runner returns `null` to mean "this tier is
 * unavailable / not confident → escalate to the next tier".
 *
 *   - tier 1 (transcript passthrough) is implemented here (pure, no I/O): it
 *     hands the transcript to the orchestrator, or returns null to escalate.
 *   - tier 2 (OpenAI-compatible sampled-frame vision) is the network adapter; its code lives
 *     in tier2.ts (the effect boundary). This module only references its runner
 *     factory (`createTier2Runner`) when building `defaultRunners` — a table
 *     wiring, not an effect, so the walk core below stays pure.
 *   - tier 3 (frames-into-context) is fully implemented and TOTAL — it never
 *     returns null. It hands the sampled frames straight back to the orchestrator
 *     model as tool-result image parts (DESIGN §2 universal fallback, §5 Verified
 *     Fact #1: tool-result images reach the orchestrator), so it needs no external
 *     model call.
 *
 * The tier-walk core imports the contract/router shapes as TYPES only and defines
 * a local content union mirroring pi's tool-result shape. It uses pi's shared
 * transcript truncation utility for the documented output limits, while remaining
 * unit-testable without the pi runtime or ffmpeg. It consumes the routing decision
 * as given ("route, don't answer") — no routing, sampling, or OpenAI-wire
 * serialization happens here. The only network/env effects (tier 2) are isolated
 * in tier2.ts.
 */
import type { Tier, RoutingDecision } from "../router/index.js";
import type { WatchedFrameSet } from "../contract/index.js";
import type { AvailableEvidence } from "../contract/watched-frame-set.js";
/** A text part of tool-result content. */
export type WatchTextPart = {
    type: "text";
    text: string;
};
/** An image part of tool-result content: base64 payload + its MIME type. */
export type WatchImagePart = {
    type: "image";
    data: string;
    mimeType: string;
};
/** One part of the watch tool's tool-result content. */
export type WatchContentPart = WatchTextPart | WatchImagePart;
/** The outcome of running a single tier. */
export interface TierResult {
    tier: Tier;
    content: WatchContentPart[];
    details?: Record<string, unknown>;
}
/**
 * A tier implementation. Resolves to a `TierResult` when it can answer, or to
 * `null` to signal "unavailable / not confident → escalate to the next tier".
 *
 * Async by contract: real adapters (e.g. tier 2's OpenAI-compatible video model)
 * perform network I/O, so every runner returns a Promise. Pure runners (tier 1
 * transcript passthrough, tier 3 frames-into-context) simply resolve immediately.
 */
export type TierRunner = (args: {
    set: WatchedFrameSet;
    decision: RoutingDecision;
    question: string;
}) => Promise<TierResult | null>;
export interface BoundedToolResult {
    content: WatchContentPart[];
    truncated: boolean;
    returnedEvidence: AvailableEvidence;
}
/** Bound final text and report evidence retained in complete returned parts. */
export declare function boundToolResult(content: WatchContentPart[], preserveTrailingParts?: number): BoundedToolResult;
export declare function boundToolResultContent(content: WatchContentPart[], preserveTrailingParts?: number): WatchContentPart[];
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
export declare function framesToToolResultContent(set: WatchedFrameSet, question: string): WatchContentPart[];
/**
 * Build the tier-1 tool-result content: the video's transcript handed back to
 * the orchestrator as text on a shared mm:ss timeline (DESIGN §2 — tier 1 is the
 * cheapest, model-agnostic answering path: no frames, no external model call).
 *
 * Layout:
 *   1. a leading text part stating the question, the transcript source, and that
 *      the answer should come from the transcript below;
 *   2. one text part per segment, formatted `mm:ss <text>`, in timeline order.
 *
 * Pure: reads only, no mutation. Assumes a usable transcript exists; the caller
 * (`tier1Runner`) gates on transcriptSource/segments and escalates when absent.
 */
export declare function transcriptToToolResultContent(set: WatchedFrameSet, question: string): WatchContentPart[];
/**
 * Tier 3 — frames-into-context. TOTAL: always returns a result (never null);
 * it is the universal terminal fallback every routing chain ends in.
 */
export declare const tier3Runner: TierRunner;
/**
 * Tier 1 — transcript adapter (DESIGN §2: cheapest, model-agnostic). When a
 * usable transcript exists, hand it to the orchestrator as text; otherwise
 * return null to escalate to the video tiers. No network, no external model.
 */
export declare const tier1Runner: TierRunner;
/**
 * Tier 2 — OpenAI-compatible sampled-frame vision adapter (DESIGN §4). The runner is
 * built in tier2.ts; this default reads its endpoint config from the environment
 * (`WATCH_TIER2_*`) and escalates (returns null) when unconfigured or on failure.
 */
export declare const tier2Runner: TierRunner;
/** Default runner table: tiers 1 (transcript), 2 (sampled-frame vision), and 3 (frames) all implemented; tier 2 escalates when unconfigured. */
export declare const defaultRunners: Record<Tier, TierRunner>;
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
export declare function walkTierChain(args: {
    set: WatchedFrameSet;
    decision: RoutingDecision;
    question: string;
    runners?: Record<Tier, TierRunner>;
}): Promise<TierResult>;
//# sourceMappingURL=tier-runner.d.ts.map