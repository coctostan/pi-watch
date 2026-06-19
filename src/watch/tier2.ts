/**
 * tier2.ts — the tier-2 adapter for the `watch` tool (DESIGN.md §4 / §5 #2).
 *
 * Tier 2 is "native video understanding via an OpenAI-compatible endpoint". The
 * key insight (runtime-proven, DESIGN §5 Verified Fact #2): every tier-2 backend
 * — local Qwen3-VL via `mlx_vlm.server`, or a hosted endpoint such as Gemini —
 * speaks the *same* OpenAI `/v1/chat/completions` shape and accepts the sampled
 * frames as ordered base64 `image_url` blocks interleaved with text (NOT a video
 * file). So the adapter is just `baseURL` + `model id`; there are no per-model
 * code forks.
 *
 * Effect boundary: this is the watch module's first network + env effect. It is
 * kept OUT of the pure tier-walk core (tier-runner.ts) on purpose. The wire-shape
 * builder (`buildTier2Request`) and the response parser (`parseTier2Answer`) are
 * pure functions; the only effects are the single env read (isolated in
 * `resolveTier2ConfigFromEnv`, so Phase 7 can replace it with a real config
 * surface) and the `fetch` call inside the runner produced by `createTier2Runner`.
 *
 * Failure policy: the runner NEVER throws through the host. Missing config, a
 * non-2xx response, a network error, or an empty/garbled answer all resolve to
 * `null` so `walkTierChain` escalates to tier 3 (the universal fallback).
 */

import { toOpenAIContent } from "../contract/index.js";
import type { WatchedFrameSet } from "../contract/index.js";
import type { TierRunner } from "./tier-runner.js";

/**
 * Tier-2 endpoint configuration. `baseURL` must include the OpenAI `/v1` segment
 * (e.g. `http://localhost:8080/v1`); `model` is the served model id. `apiKey` is
 * optional — local `mlx_vlm.server` needs none; hosted endpoints set one.
 */
export interface Tier2Config {
	baseURL: string;
	model: string;
	apiKey?: string;
}

/**
 * Build the OpenAI `/v1/chat/completions` request for a watched frame set. Pure:
 * depends only on its arguments; performs no I/O. The frames + transcript are
 * serialized to the proven OpenAI `content[]` wire shape via `toOpenAIContent`
 * (ordered `image_url` blocks + interleaved mm:ss text) — the same shape both
 * spikes confirmed (DESIGN §5 #2). A leading header text part states the question
 * and asks the model to answer from the timeline below.
 */
export function buildTier2Request(
	set: WatchedFrameSet,
	question: string,
	config: Tier2Config,
): { url: string; init: RequestInit } {
	const url = `${config.baseURL.replace(/\/+$/, "")}/chat/completions`;

	const header =
		`Question: ${question}\n` +
		`The video's sampled frames and transcript are provided below in timeline ` +
		`order as image and text parts. Answer the question from them.`;

	const body = {
		model: config.model,
		temperature: 0,
		messages: [
			{
				role: "user",
				content: toOpenAIContent(set, { header }),
			},
		],
	};

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (config.apiKey) {
		headers.Authorization = `Bearer ${config.apiKey}`;
	}

	return {
		url,
		init: {
			method: "POST",
			headers,
			body: JSON.stringify(body),
		},
	};
}

/**
 * Extract the answer text from an OpenAI chat-completion response. Pure and
 * fully defensive: any missing or wrong-typed field yields `null` (never throws).
 *
 * Handles both content shapes returned in the wild:
 *   - `choices[0].message.content` as a plain string, and
 *   - `content` as an array of parts (joins the `text` of `{type:"text",text}`
 *     parts). An empty/whitespace-only result is treated as no answer (`null`).
 */
export function parseTier2Answer(json: unknown): string | null {
	if (typeof json !== "object" || json === null) return null;

	const choices = (json as { choices?: unknown }).choices;
	if (!Array.isArray(choices) || choices.length === 0) return null;

	const first = choices[0];
	if (typeof first !== "object" || first === null) return null;

	const message = (first as { message?: unknown }).message;
	if (typeof message !== "object" || message === null) return null;

	const content = (message as { content?: unknown }).content;

	let text: string;
	if (typeof content === "string") {
		text = content;
	} else if (Array.isArray(content)) {
		text = content
			.map((part) => {
				if (
					typeof part === "object" &&
					part !== null &&
					(part as { type?: unknown }).type === "text" &&
					typeof (part as { text?: unknown }).text === "string"
				) {
					return (part as { text: string }).text;
				}
				return "";
			})
			.join("");
	} else {
		return null;
	}

	const trimmed = text.trim();
	return trimmed.length > 0 ? text : null;
}

/**
 * Resolve tier-2 config from environment variables. This is the ONLY env read in
 * the watch module; it is deliberately isolated so Phase 7 (the config surface)
 * can swap it for a typed config without touching the adapter. Pure aside from
 * reading the passed `env` (defaults to `process.env`).
 *
 * Requires BOTH `WATCH_TIER2_BASE_URL` and `WATCH_TIER2_MODEL` (non-empty);
 * `WATCH_TIER2_API_KEY` is optional. Returns `null` when either required value
 * is absent/empty → tier 2 is "unconfigured" and the runner escalates.
 */
export function resolveTier2ConfigFromEnv(
	env: NodeJS.ProcessEnv = process.env,
): Tier2Config | null {
	const baseURL = env.WATCH_TIER2_BASE_URL?.trim();
	const model = env.WATCH_TIER2_MODEL?.trim();
	if (!baseURL || !model) return null;

	const apiKey = env.WATCH_TIER2_API_KEY?.trim();
	return apiKey ? { baseURL, model, apiKey } : { baseURL, model };
}

/**
 * Create the tier-2 `TierRunner` (DESIGN §4). The returned runner, per call:
 *   1. resolves config (injected `config` when provided — including an explicit
 *      `null` to force "unconfigured" — else from the environment);
 *   2. returns `null` WITHOUT any network call when unconfigured;
 *   3. POSTs the serialized frames to the endpoint via `fetch`;
 *   4. returns the parsed answer as a tier-2 `TierResult`, or `null` on any
 *      non-2xx status, network error, or empty/garbled answer.
 *
 * The API key is never logged. `fetchImpl` is injectable for deterministic tests
 * (no live model); it defaults to Node's global `fetch` (Node ≥20, zero deps).
 */
export function createTier2Runner(deps?: {
	config?: Tier2Config | null;
	fetchImpl?: typeof fetch;
}): TierRunner {
	return async ({ set, question }) => {
		const config =
			deps && "config" in deps ? deps.config : resolveTier2ConfigFromEnv();
		if (!config) return null;

		const { url, init } = buildTier2Request(set, question, config);
		const f = deps?.fetchImpl ?? fetch;

		try {
			const res = await f(url, init);
			if (!res.ok) return null;
			const json: unknown = await res.json();
			const answer = parseTier2Answer(json);
			if (answer === null) return null;
			return {
				tier: 2,
				content: [{ type: "text", text: answer }],
				details: { tier: 2, model: config.model },
			};
		} catch {
			return null;
		}
	};
}
