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
import { type Tier } from "../router/index.js";
import { type WatchContentPart } from "./tier-runner.js";
import { type Tier2Diagnostic } from "./tier2.js";
/**
 * `watch` tool parameters (TypeBox → static type + runtime schema).
 *
 * NOTE: `resolution` uses Type.Union of literals to match the project's contract
 * convention (src/contract: ResolutionTier). If a Google-compatible provider is
 * ever targeted, migrate this to `StringEnum` from `@earendil-works/pi-ai`
 * (docs/extensions.md: Type.Union/Type.Literal is rejected by Google's API) —
 * deferred to Phase 6, when pi-ai enters for the tier-2 adapter anyway.
 */
export declare const WATCH_PARAMS: Type.TObject<{
    ref: Type.TString;
    question: Type.TString;
    budget: Type.TOptional<Type.TInteger>;
    resolution: Type.TOptional<Type.TUnion<[Type.TLiteral<"low">, Type.TLiteral<"high">]>>;
}>;
/** Static input type for the `watch` tool's `execute`. */
export type WatchInput = Static<typeof WATCH_PARAMS>;
/** `watch_batch` tool parameters (TypeBox → static type + runtime schema). */
export declare const WATCH_BATCH_PARAMS: Type.TObject<{
    items: Type.TArray<Type.TObject<{
        ref: Type.TString;
        question: Type.TString;
    }>>;
    budget: Type.TOptional<Type.TInteger>;
    resolution: Type.TOptional<Type.TUnion<[Type.TLiteral<"low">, Type.TLiteral<"high">]>>;
}>;
/** Static input type for the `watch_batch` tool's `execute`. */
export type WatchBatchInput = Static<typeof WATCH_BATCH_PARAMS>;
/**
 * Merge a collected tier-2 failure diagnostic into tool-result `details`, but
 * only when tier 2 did NOT answer. A successful tier-2 result (finalTier === 2)
 * records no failure diagnostic (AC-3). Pure.
 */
export declare function withTier2Diagnostic(details: Record<string, unknown>, finalTier: Tier, diagnostic: Tier2Diagnostic | undefined): Record<string, unknown>;
/**
 * Append the tier-2 unconfigured guidance to a single-video `watch` result's
 * content, but ONLY when tier 2 was unconfigured AND another tier answered
 * (finalTier !== 2). Pure and total: never mutates the input array; returns it
 * unchanged for every other case (configured tier 2, a tier-2 answer, or a
 * non-unconfigured failure such as http-error/timeout/network-error) so no
 * guidance noise appears (AC-1/AC-2). The appended text is the shared, secret-free
 * {@link TIER2_UNCONFIGURED_HINT}.
 */
export declare function withUnconfiguredHint(content: WatchContentPart[], finalTier: Tier, diagnostic: Tier2Diagnostic | undefined): WatchContentPart[];
/**
 * Extension factory: registers the `watch` tool AND the `/watch` command.
 * Synchronous registration (no await before `registerTool`/`registerCommand`)
 * per the Phase-1 activation recipe.
 *
 * Config (Phase 7): the typed config surface is resolved ONCE here from the
 * environment (`resolveWatchConfig`). It supplies the tier-2 endpoint + fetch
 * timeout (used to build a config-driven tier-2 runner) and the default frame
 * budget/resolution applied under per-call `WATCH_PARAMS` overrides. Reading
 * `process.env` synchronously is fine; no await is introduced before registration.
 */
export default function watchExtension(pi: ExtensionAPI): void;
//# sourceMappingURL=extension.d.ts.map