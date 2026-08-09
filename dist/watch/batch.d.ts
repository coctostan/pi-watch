/**
 * batch.ts — pure batching core for the `watch_batch` tool (DESIGN.md §7 step 6).
 *
 * Batching wraps the load-bearing single-video `watch` primitive rather than
 * changing it. DESIGN §5/§9 is explicit: tiers 1/2 are cheap text outputs that
 * can be fanned out in parallel; tier-3 batch (frames for many videos) needs the
 * deferred subagent fan-out. This module therefore aggregates tier-1/2 text and
 * surfaces tier-3 items as per-video `/watch` follow-ups instead of inlining many
 * videos' frames into one tool-result payload.
 *
 * Pure core / explicit effects: this file is pi-free and performs no sampling,
 * routing, network, or filesystem work. The extension boundary injects the
 * per-item sample → route → walkTierChain processor; tests inject deterministic
 * stubs.
 */
import type { Tier } from "../router/index.js";
import type { TierResult, WatchContentPart } from "./tier-runner.js";
/** Conservative cap for local ffmpeg/model fan-out in one batch call. */
export declare const WATCH_BATCH_MAX_ITEMS = 8;
/** Hard cap for aggregate text emitted by one watch_batch call. */
export declare const WATCH_BATCH_MAX_TEXT_CHARS = 24000;
/** One video/question pair in a batch request. */
export interface BatchItem {
    ref: string;
    question: string;
}
/** The effectful per-item watch pipeline injected by the extension boundary. */
export type WatchItemProcessor = (item: BatchItem) => Promise<TierResult>;
/** One input item's isolated outcome. */
export interface BatchItemResult {
    index: number;
    ref: string;
    question: string;
    status: "ok" | "error";
    tier?: Tier;
    content?: WatchContentPart[];
    details?: Record<string, unknown>;
    error?: string;
}
/** The complete batch outcome, including aggregate tool-result content. */
export interface BatchResult {
    items: BatchItemResult[];
    content: WatchContentPart[];
}
/**
 * Fan out over many watch items, isolate per-item failures, and aggregate a
 * bounded text-only result. Pure aside from the injected per-item processor.
 */
export declare function runWatchBatch(items: BatchItem[], deps: {
    processItem: WatchItemProcessor;
}): Promise<BatchResult>;
//# sourceMappingURL=batch.d.ts.map