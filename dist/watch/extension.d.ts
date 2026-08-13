/**
 * extension.ts — the `watch` pi custom tool (effect boundary, DESIGN.md §2/§7).
 *
 * Staged sampling calls the deterministic router with transcript availability,
 * records one decision per single or batch item, and performs visual attachment
 * only when that same decision requires it before `walkTierChain()`.
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
 * runners; this file only wires effects to the pure core and surfaces failures
 * by throwing a contextual error through the host.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { type Static, type TArray, type TInteger, type TObject, type TOptional, type TString, type TUnsafe } from "typebox";
import { type Tier } from "../router/index.js";
import { type WatchContentPart } from "./tier-runner.js";
import { type Tier2Diagnostic } from "./tier2.js";
/**
 * `watch` tool parameters (TypeBox → static type + runtime schema).
 *
 * `StringEnum` keeps the resolution schema compatible with providers such as
 * Google's API that reject Type.Union/Type.Literal schemas.
 */
type WatchParamsSchema = TObject<{
    ref: TString;
    question: TString;
    budget: TOptional<TInteger>;
    resolution: TOptional<TUnsafe<"low" | "high">>;
    start: TOptional<TInteger>;
    end: TOptional<TInteger>;
}>;
export declare const WATCH_PARAMS: WatchParamsSchema;
/** Static input type for the `watch` tool's `execute`. */
export type WatchInput = Static<typeof WATCH_PARAMS>;
/** `watch_batch` tool parameters (TypeBox → static type + runtime schema). */
type WatchBatchItemSchema = TObject<{
    ref: TString;
    question: TString;
}>;
type WatchBatchParamsSchema = TObject<{
    items: TArray<WatchBatchItemSchema>;
    budget: TOptional<TInteger>;
    resolution: TOptional<TUnsafe<"low" | "high">>;
    start: TOptional<TInteger>;
    end: TOptional<TInteger>;
}>;
export declare const WATCH_BATCH_PARAMS: WatchBatchParamsSchema;
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
export {};
//# sourceMappingURL=extension.d.ts.map