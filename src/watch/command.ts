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
 * Result of parsing the raw `/watch` argument string.
 *   - `{ ok: true, ref, question }`  — a video ref and a non-empty question.
 *   - `{ ok: false, usage }`         — empty input or a ref with no question.
 */
export type WatchCommandParse =
	| { ok: true; ref: string; question: string }
	| { ok: false; usage: string };

/**
 * Effects the command runner needs, injected at the extension boundary so the
 * core stays pure/testable.
 *   - `notify`: surface a user-facing message (maps to `ctx.ui.notify`).
 *   - `send`:   hand a steering message to the agent (maps to `pi.sendUserMessage`).
 */
export interface WatchCommandEffects {
	notify: (message: string, level: "info" | "warning" | "error") => void;
	send: (content: string) => void;
}

/**
 * Parse the raw argument string that follows `/watch `. Pure and total
 * (never throws): the FIRST whitespace-delimited token is the `ref`, the
 * remaining trimmed text is the `question`. Empty input or a ref with no
 * following question yields `{ ok: false }` carrying the usage string.
 */
export function parseWatchCommand(args: string): WatchCommandParse {
	const trimmed = args.trim();
	if (trimmed === "") {
		return { ok: false, usage: WATCH_COMMAND_USAGE };
	}

	// Locate the first whitespace run: the ref is everything before it, the
	// question is the trimmed remainder. No whitespace at all → a bare ref with
	// no question. (Manual split avoids regex capture groups, which type as
	// `string | undefined` under noUncheckedIndexedAccess.)
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
export function buildWatchPrompt(ref: string, question: string): string {
	return `Use the watch tool to answer this question about the video "${ref}": ${question}`;
}

/**
 * Run the `/watch` command with injected effects. Pure aside from the effects it
 * is handed. On invalid input it notifies the usage string at "warning" level and
 * does NOT send; on valid input it sends the agent-steering prompt and does NOT
 * notify an error.
 */
export function runWatchCommand(args: string, effects: WatchCommandEffects): void {
	const parsed = parseWatchCommand(args);
	if (!parsed.ok) {
		effects.notify(parsed.usage, "warning");
		return;
	}
	effects.send(buildWatchPrompt(parsed.ref, parsed.question));
}
