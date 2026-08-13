/**
 * command.ts — the pure core of the `/watch` slash command (DESIGN.md §1, §7 step 5).
 *
 * The `/watch` command is the UX wrapper over the load-bearing `watch` TOOL
 * primitive. It does NOT re-implement the sampler → router → tier-walk pipeline;
 * instead it hands a steering message back to the agent (Phase-8 decision:
 * option-a), so the agent invokes the `watch` tool through the normal tool-call
 * flow. That indirection is deliberate and load-bearing: tier 3 (the universal
 * fallback) returns the sampled frames as tool-result `ImageContent` destined for
 * the ORCHESTRATOR model (DESIGN §2, §5 Verified Fact #1). A slash-command handler
 * returns `void` and can only surface text notifications — it has no channel to
 * inject images into the model's context. Delegating to the agent is the only path
 * that preserves all three tiers.
 *
 * Pure core / explicit effects (AGENTS.md): everything in this file is PURE and
 * pi-free — argument parsing, the prompt builder, and an effect-INJECTED runner
 * (`runWatchCommand(args, effects)`). The real effects (`ctx.ui.notify`,
 * `pi.sendUserMessage`) are wired in at the extension boundary (extension.ts),
 * mirroring the tier-2 adapter's injected-`fetchImpl` convention. This keeps the
 * whole command logic unit-testable without the pi runtime.
 */
/** Usage string shown when the command is invoked with missing/incomplete input. */
export const WATCH_COMMAND_USAGE = "Usage: /watch <video-path-or-url> <question>";
/**
 * Parse the raw argument string that follows `/watch `. Pure and total
 * (never throws). Unquoted input keeps the legacy first-token ref grammar. A
 * leading single or double quote may wrap one non-empty ref containing spaces;
 * only the matching outer quotes are removed, and the closing quote must be
 * followed by whitespace plus a non-empty question. This deliberately is not
 * a shell grammar: escapes, concatenation, and nested quoting are not parsed.
 */
export function parseWatchCommand(args) {
    const trimmed = args.trim();
    if (trimmed === "") {
        return { ok: false, usage: WATCH_COMMAND_USAGE };
    }
    const openingQuote = trimmed[0];
    if (openingQuote === "'" || openingQuote === '"') {
        const closingQuote = trimmed.indexOf(openingQuote, 1);
        if (closingQuote <= 1 || !/\s/.test(trimmed[closingQuote + 1] ?? "")) {
            return { ok: false, usage: WATCH_COMMAND_USAGE };
        }
        const question = trimmed.slice(closingQuote + 1).trim();
        if (question === "") {
            return { ok: false, usage: WATCH_COMMAND_USAGE };
        }
        return { ok: true, ref: trimmed.slice(1, closingQuote), question };
    }
    const firstSpace = trimmed.search(/\s/);
    if (firstSpace === -1) {
        return { ok: false, usage: WATCH_COMMAND_USAGE };
    }
    const ref = trimmed.slice(0, firstSpace);
    const question = trimmed.slice(firstSpace + 1).trim();
    if (question === "") {
        return { ok: false, usage: WATCH_COMMAND_USAGE };
    }
    return { ok: true, ref, question };
}
/**
 * Build the steering message handed back to the agent. Pure. One clear sentence
 * that names the ref + question and points the agent at the `watch` tool; it
 * deliberately carries NO budget/resolution params — the router + resolved config
 * own those defaults (DESIGN §3, Phase 7).
 */
export function buildWatchPrompt(ref, question) {
    return `Use the watch tool to answer this question about the video "${ref}": ${question}`;
}
/**
 * Run the `/watch` command with injected effects. Pure aside from the effects it
 * is handed. On invalid input it notifies the usage string at "warning" level and
 * does NOT send; on valid input it sends the agent-steering prompt and does NOT
 * notify an error.
 */
export function runWatchCommand(args, effects) {
    const parsed = parseWatchCommand(args);
    if (!parsed.ok) {
        effects.notify(parsed.usage, "warning");
        return;
    }
    effects.send(buildWatchPrompt(parsed.ref, parsed.question));
}
//# sourceMappingURL=command.js.map