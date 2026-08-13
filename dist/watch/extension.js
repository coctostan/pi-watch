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
import { StringEnum } from "@earendil-works/pi-ai";
import { Type, } from "typebox";
import { sample, } from "../sampler/index.js";
import { MAX_RANGE_SECONDS } from "../sampler/range.js";
import { classifyQuestion, isLocalAsrEligible, route, routeContextFromSet } from "../router/index.js";
import { resolveWatchConfig } from "../config/index.js";
import { walkTierChain, boundToolResult, defaultRunners, } from "./tier-runner.js";
import { createTier2Runner, TIER2_UNCONFIGURED_HINT, } from "./tier2.js";
import { runWatchCommand } from "./command.js";
import { runWatchBatch, WATCH_BATCH_MAX_ITEMS, } from "./batch.js";
export const WATCH_PARAMS = Type.Object({
    ref: Type.String({
        description: "Video reference: local file path or http(s) URL",
    }),
    question: Type.String({
        description: "What to find out about the video",
    }),
    budget: Type.Optional(Type.Integer({
        minimum: 1,
        description: "Max frames to sample (default ~16)",
    })),
    resolution: Type.Optional(StringEnum(["low", "high"], {
        description: "Optional frame-resolution override; normally the router sets this by question intent.",
    })),
    start: Type.Optional(Type.Integer({
        minimum: 0,
        maximum: MAX_RANGE_SECONDS,
        description: "Inclusive source start in conversion-safe whole seconds",
    })),
    end: Type.Optional(Type.Integer({
        minimum: 0,
        maximum: MAX_RANGE_SECONDS,
        description: "Exclusive source end in conversion-safe whole seconds",
    })),
});
export const WATCH_BATCH_PARAMS = Type.Object({
    items: Type.Array(Type.Object({
        ref: Type.String({
            description: "Video reference: local file path or http(s) URL",
        }),
        question: Type.String({
            description: "What to find out about this video",
        }),
    }), {
        minItems: 1,
        maxItems: WATCH_BATCH_MAX_ITEMS,
        description: "Video/question pairs to watch in parallel",
    }),
    budget: Type.Optional(Type.Integer({
        minimum: 1,
        description: "Shared max frames to sample per video (default ~16)",
    })),
    resolution: Type.Optional(StringEnum(["low", "high"], {
        description: "Shared frame-resolution override for every item; normally the router sets this by question intent.",
    })),
    start: Type.Optional(Type.Integer({
        minimum: 0,
        maximum: MAX_RANGE_SECONDS,
        description: "Shared inclusive source start in conversion-safe whole seconds",
    })),
    end: Type.Optional(Type.Integer({
        minimum: 0,
        maximum: MAX_RANGE_SECONDS,
        description: "Shared exclusive source end in conversion-safe whole seconds",
    })),
});
const WATCH_DESCRIPTION = "Watch a video (local file or URL) and answer a question about it. Samples " +
    "frames + best-effort transcript, then routes to the cheapest tier that can " +
    "answer (transcript → sampled-frame vision → frames-into-context), returning the answer " +
    "and, for the frames tier, the sampled frames themselves. Tool-result text, " +
    "including transcripts, is truncated at Pi's 50 KB / 2,000-line output limits.";
const WATCH_BATCH_DESCRIPTION = "Watch several videos in one call. Samples each video, routes each to the " +
    "cheapest available tier, and returns combined text answers; tier-3 frame " +
    "batch fan-out is deferred to individual single-video watch calls.";
/**
 * Merge a collected tier-2 failure diagnostic into tool-result `details`, but
 * only when tier 2 did NOT answer. A successful tier-2 result (finalTier === 2)
 * records no failure diagnostic (AC-3). Pure.
 */
export function withTier2Diagnostic(details, finalTier, diagnostic) {
    return finalTier !== 2 && diagnostic
        ? { ...details, tier2: diagnostic }
        : details;
}
/**
 * Append the tier-2 unconfigured guidance to a single-video `watch` result's
 * content, but ONLY when tier 2 was unconfigured AND another tier answered
 * (finalTier !== 2). Pure and total: never mutates the input array; returns it
 * unchanged for every other case (configured tier 2, a tier-2 answer, or a
 * non-unconfigured failure such as http-error/timeout/network-error) so no
 * guidance noise appears (AC-1/AC-2). The appended text is the shared, secret-free
 * {@link TIER2_UNCONFIGURED_HINT}.
 */
export function withUnconfiguredHint(content, finalTier, diagnostic) {
    return finalTier !== 2 && diagnostic?.reason === "unconfigured"
        ? [...content, { type: "text", text: TIER2_UNCONFIGURED_HINT }]
        : content;
}
/**
 * Batch tier-3 placeholder: frame fan-out for many videos is deferred to
 * single-video watch calls (DESIGN §5/§9), so the batch tier-3 runner returns a
 * follow-up note instead of inlining frames. Pure; total (never null).
 */
const batchTier3Runner = async ({ set }) => ({
    tier: 3,
    content: [
        {
            type: "text",
            text: "Tier 3 deferred for watch_batch; run the single-video watch tool individually for frames.",
        },
    ],
    details: { tier: 3, frameCount: set.frames.length, deferred: true },
});
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
export default function watchExtension(pi) {
    // Resolve the typed config once (the only env read). Build a FRESH tier-2
    // runner per call / batch-item (option-a, Phase 12) so each gets its own
    // diagnostic collector; tiers 1 + 3 are pure and come from the defaults.
    const config = resolveWatchConfig(process.env);
    const makeTier2Runner = (onDiagnostic) => createTier2Runner({
        config: config.tier2,
        timeoutMs: config.fetchTimeoutMs,
        onDiagnostic,
    });
    // Pin TDetails to a shared record for the successful `execute` result.
    pi.registerTool({
        name: "watch",
        label: "Watch",
        description: WATCH_DESCRIPTION,
        // MANDATORY (Phase-1 finding): omitting this drops the tool from the prompt.
        promptSnippet: "Watch a video and answer a question about it using the cheapest tier that works",
        promptGuidelines: [
            "Use `watch` for visual, temporal, or spoken questions about a video file path or http(s) URL.",
            "Pass the user's actual question as `question` so the tool can route to the cheapest answering tier.",
        ],
        parameters: WATCH_PARAMS,
        async execute(_toolCallId, params) {
            let sceneDetectionDiagnostic;
            let asrDiagnostic;
            let stagedDecision;
            const questionPolicy = classifyQuestion(params.question);
            const asrEligible = config.localAsr !== null && isLocalAsrEligible(questionPolicy.intent);
            try {
                const set = await sample({
                    ref: params.ref,
                    budget: params.budget ?? config.budget,
                    resolution: params.resolution ?? (questionPolicy.resolution === "high" ? "high" : config.resolution),
                    ...(params.start === undefined ? {} : { start: params.start }),
                    ...(params.end === undefined ? {} : { end: params.end }),
                    needsVisualEvidence: (context) => {
                        stagedDecision = route({ question: params.question, context });
                        return stagedDecision.primaryTier !== 1;
                    },
                    onSceneDetectionDiagnostic: (diagnostic) => {
                        sceneDetectionDiagnostic = diagnostic;
                    },
                    ...(asrEligible
                        ? {
                            localAsr: config.localAsr,
                            onAsrDiagnostic: (diagnostic) => {
                                asrDiagnostic = diagnostic;
                            },
                        }
                        : {}),
                });
                const decision = stagedDecision ??
                    route({ question: params.question, context: routeContextFromSet(set) });
                // Fresh per-call diagnostic collector + tier-2 runner (option-a).
                let tier2Diagnostic;
                const runners = {
                    ...defaultRunners,
                    2: makeTier2Runner((diagnostic) => {
                        tier2Diagnostic = diagnostic;
                    }),
                };
                const result = await walkTierChain({
                    set,
                    decision,
                    question: params.question,
                    runners,
                });
                const contentWithHint = withUnconfiguredHint(result.content, result.tier, tier2Diagnostic);
                const preservedTrailingParts = contentWithHint.length - result.content.length;
                const bounded = boundToolResult(contentWithHint, preservedTrailingParts);
                const tierTruncation = typeof result.details?.truncation === "object" && result.details.truncation !== null
                    ? result.details.truncation
                    : {};
                return {
                    content: bounded.content,
                    details: withTier2Diagnostic({
                        tier: result.tier,
                        intent: decision.intent,
                        resolution: decision.resolution,
                        tiers: decision.tiers,
                        rationale: decision.rationale,
                        frameCount: set.frames.length,
                        transcriptSource: set.source.transcriptSource,
                        ...(set.source.range ? { range: set.source.range } : {}),
                        ...(set.source.available
                            ? { availableEvidence: set.source.available }
                            : {}),
                        returnedEvidence: bounded.returnedEvidence,
                        truncation: {
                            ...tierTruncation,
                            final: bounded.truncated || tierTruncation.transcript === true,
                        },
                        ...(sceneDetectionDiagnostic
                            ? { sceneDetection: sceneDetectionDiagnostic }
                            : {}),
                        ...(asrEligible && asrDiagnostic ? { asr: asrDiagnostic } : {}),
                    }, result.tier, tier2Diagnostic),
                };
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                throw new Error(`watch failed for "${params.ref}": ${message}`);
            }
        },
    });
    // `watch_batch` uses the same transcript-stage decision per item. Tier-1/2
    // text results aggregate; tier-3 frame batches remain deferred to individual
    // `/watch` calls rather than inlining many videos' frames.
    pi.registerTool({
        name: "watch_batch",
        label: "Watch Batch",
        description: WATCH_BATCH_DESCRIPTION,
        // MANDATORY (Phase-1 finding): omitting this drops the tool from the prompt.
        promptSnippet: "Watch several videos in one call and return combined text answers; use single-video watch calls for frame-heavy tier-3 items",
        promptGuidelines: [
            "Use `watch_batch` when the user asks the same or related questions across multiple video refs.",
            "Pass each video/question pair in `items`; shared budget/resolution overrides apply to every item.",
            "For frame-heavy tier-3 cases, expect the batch result to ask for single-video watch follow-up calls.",
        ],
        parameters: WATCH_BATCH_PARAMS,
        async execute(_toolCallId, params) {
            try {
                const asrDiagnostics = [];
                const processItem = async (item) => {
                    const { ref, question } = item;
                    const itemIndex = params.items.indexOf(item);
                    let stagedDecision;
                    const questionPolicy = classifyQuestion(question);
                    const asrEligible = config.localAsr !== null && isLocalAsrEligible(questionPolicy.intent);
                    const set = await sample({
                        ref,
                        budget: params.budget ?? config.budget,
                        resolution: params.resolution ?? (questionPolicy.resolution === "high" ? "high" : config.resolution),
                        ...(params.start === undefined ? {} : { start: params.start }),
                        ...(params.end === undefined ? {} : { end: params.end }),
                        needsVisualEvidence: (context) => {
                            stagedDecision = route({ question, context });
                            return stagedDecision.primaryTier !== 1;
                        },
                        ...(asrEligible
                            ? {
                                localAsr: config.localAsr,
                                onAsrDiagnostic: (diagnostic) => {
                                    asrDiagnostics.push({ index: itemIndex, diagnostic });
                                },
                            }
                            : {}),
                    });
                    const decision = stagedDecision ?? route({ question, context: routeContextFromSet(set) });
                    // Fresh per-item diagnostic collector + tier-2 runner (option-a);
                    // tier-3 frame batch stays deferred to single-video watch calls.
                    let tier2Diagnostic;
                    const itemRunners = {
                        ...defaultRunners,
                        2: makeTier2Runner((diagnostic) => {
                            tier2Diagnostic = diagnostic;
                        }),
                        3: batchTier3Runner,
                    };
                    const result = await walkTierChain({
                        set,
                        decision,
                        question,
                        runners: itemRunners,
                    });
                    const noReturnedEvidence = {
                        frames: { count: 0, firstMs: null, lastMs: null },
                        transcript: { count: 0, firstMs: null, lastMs: null },
                    };
                    const details = {
                        ...(result.details ?? {}),
                        ...(set.source.range ? { range: set.source.range } : {}),
                        ...(set.source.available
                            ? { availableEvidence: set.source.available }
                            : {}),
                        returnedEvidence: result.details?.returnedEvidence ??
                            noReturnedEvidence,
                    };
                    return {
                        ...result,
                        details: result.tier !== 2 && tier2Diagnostic
                            ? withTier2Diagnostic(details, result.tier, tier2Diagnostic)
                            : details,
                    };
                };
                const result = await runWatchBatch(params.items, { processItem });
                const bounded = boundToolResult(result.content);
                return {
                    content: bounded.content,
                    details: {
                        count: params.items.length,
                        tiers: result.items.map((item) => item.tier),
                        errors: result.items.filter((item) => item.status === "error").length,
                        evidence: result.evidence,
                        truncation: {
                            aggregate: result.aggregateTruncated,
                            final: bounded.truncated,
                        },
                        ...(asrDiagnostics.length > 0
                            ? { asr: asrDiagnostics.sort((a, b) => a.index - b.index) }
                            : {}),
                    },
                };
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                throw new Error(`watch_batch failed: ${message}`);
            }
        },
    });
    // `/watch` command (Phase 8): the UX wrapper over the `watch` tool. It does
    // NOT run the pipeline itself — a command handler returns void and can only
    // notify text, so it cannot deliver tier-3 frames (tool-result ImageContent
    // destined for the orchestrator, DESIGN §5 #1). Instead it steers the agent
    // to invoke the `watch` tool via the normal tool-call flow, preserving all
    // three tiers. Registered synchronously alongside the tool (activation recipe).
    pi.registerCommand("watch", {
        description: "Watch a video and answer a question (UX wrapper over the watch tool)",
        handler: async (args, ctx) => {
            runWatchCommand(args, {
                notify: (message, level) => ctx.ui.notify(message, level),
                send: (content) => pi.sendUserMessage(content),
            });
        },
    });
}
//# sourceMappingURL=extension.js.map