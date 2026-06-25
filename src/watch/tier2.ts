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
 * The documented localhost `mlx_vlm.server` endpoint (docs/TIER2-SETUP.md). Used
 * ONLY as the opt-in local default when `WATCH_TIER2_LOCAL=1` and no explicit
 * `WATCH_TIER2_BASE_URL`/`WATCH_TIER2_MODEL` are set. Public, secret-free values:
 * a loopback URL and a public Hugging Face model id (never an api key).
 */
export const LOCAL_TIER2_BASE_URL = "http://localhost:8080/v1";
export const LOCAL_TIER2_MODEL = "mlx-community/Qwen3-VL-8B-Instruct-4bit";

/**
 * Secret-free guidance shown to a user when tier 2 is unconfigured and another
 * tier ends up answering (Phase 13). Surfaced on the single-video `watch` result
 * content by `withUnconfiguredHint` (extension.ts). It names the two env vars and
 * points at the runbook; it MUST NEVER contain an api key, the `Authorization`
 * header, or any interpolated env value (SETH).
 */
export const TIER2_UNCONFIGURED_HINT =
	"Tier 2 (native video understanding) is unconfigured \u2014 set " +
	"WATCH_TIER2_BASE_URL and WATCH_TIER2_MODEL to enable it (or WATCH_TIER2_LOCAL=1 " +
	"to use a local mlx_vlm server). See docs/TIER2-SETUP.md.";

/**
 * Resolve tier-2 config from environment variables. As of Phase 7 the typed
 * config surface (`src/config`) is the composition point that the extension
 * boundary uses; this function remains the low-level tier-2 env building block it
 * reuses (and the only place that parses `WATCH_TIER2_*`). Pure aside from
 * reading the passed `env` (defaults to `process.env`).
 *
 * Precedence (highest wins):
 *   1. explicit `WATCH_TIER2_BASE_URL` + `WATCH_TIER2_MODEL` (both non-empty);
 *   2. else the opt-in local default when `WATCH_TIER2_LOCAL` is exactly `"1"`
 *      (→ {@link LOCAL_TIER2_BASE_URL} / {@link LOCAL_TIER2_MODEL});
 *   3. else `null` → tier 2 is "unconfigured" and the runner escalates.
 *
 * `WATCH_TIER2_API_KEY` is optional and applies to whichever endpoint resolves.
 * The DEFAULT path (no explicit vars, flag unset/other) stays network-free: it
 * returns `null` without ever pointing at localhost (Phase 12 contract).
 */
export function resolveTier2ConfigFromEnv(
	env: NodeJS.ProcessEnv = process.env,
): Tier2Config | null {
	const apiKey = env.WATCH_TIER2_API_KEY?.trim();
	const withApiKey = (base: { baseURL: string; model: string }): Tier2Config =>
		apiKey ? { ...base, apiKey } : base;

	const baseURL = env.WATCH_TIER2_BASE_URL?.trim();
	const model = env.WATCH_TIER2_MODEL?.trim();
	if (baseURL && model) return withApiKey({ baseURL, model });

	// Opt-in local default: only when BOTH explicit vars are absent/empty AND the
	// flag is exactly "1". Any other state keeps the default network-free `null`.
	if (env.WATCH_TIER2_LOCAL?.trim() === "1") {
		return withApiKey({ baseURL: LOCAL_TIER2_BASE_URL, model: LOCAL_TIER2_MODEL });
	}

	return null;
}

/** The distinct tier-2 failure modes surfaced as diagnostics (DESIGN.md §4 / Phase 12). */
export type Tier2FailureReason =
	| "unconfigured"
	| "http-error"
	| "empty-answer"
	| "timeout"
	| "network-error";

/**
 * A structured, secret-free record of WHY tier 2 did not answer on a given call.
 *
 * The tier-2 runner still escalates by resolving to `null` (so `walkTierChain`
 * advances to tier 3); this diagnostic is an optional SIDE CHANNEL emitted via
 * `createTier2Runner`'s `onDiagnostic` callback so the effect boundary can record
 * the reason in the tool-result `details`. It NEVER contains the api key, the
 * Authorization header, or the request body (SETH): only the reason, the numeric
 * HTTP status (for `http-error`), and a short non-secret message (for
 * `network-error`).
 */
export interface Tier2Diagnostic {
	tier: 2;
	reason: Tier2FailureReason;
	/** Present only for `http-error`: the numeric HTTP status (e.g. 500). */
	httpStatus?: number;
	/** Present only for `network-error`: a short, non-secret error message. */
	message?: string;
}

/** Reduce an unknown rejection to a short, non-secret message (no api key/body is ever present here). */
function shortErrorMessage(err: unknown): string {
	const raw = err instanceof Error ? err.message : String(err);
	return raw.length > 200 ? `${raw.slice(0, 200)}\u2026` : raw;
}

/**
 * Create the tier-2 `TierRunner` (DESIGN §4). The returned runner, per call:
 *   1. resolves config (injected `config` when provided — including an explicit
 *      `null` to force "unconfigured" — else from the environment);
 *   2. returns `null` WITHOUT any network call when unconfigured;
 *   3. POSTs the serialized frames to the endpoint via `fetch`, optionally bounded
 *      by an `AbortSignal` timeout when `timeoutMs` is a positive finite number;
 *   4. returns the parsed answer as a tier-2 `TierResult`, or `null` on any
 *      non-2xx status, network error, empty/garbled answer, OR a timeout/abort.
 * On timeout the call is aborted, `fetch` rejects, and the runner resolves to
 * `null` (so `walkTierChain` escalates to tier 3) — it never throws through the
 * host. The API key is never logged. `fetchImpl` is injectable for deterministic
 * tests (no live model); it defaults to Node's global `fetch`. `AbortSignal.timeout`
 * is Node ≥20 (zero deps).
 *
 * Diagnostics (Phase 12): an optional `onDiagnostic` callback is invoked exactly
 * once, right before each `return null`, with a structured {@link Tier2Diagnostic}
 * naming the failure reason. This is a pure SIDE CHANNEL: it does NOT change the
 * escalation contract (`null` still means "escalate"), the success path (which
 * emits no diagnostic), or the wire shape. The callback is best-effort and never
 * throws through the runner. No diagnostic carries the api key, Authorization
 * header, or request body (SETH).
 */
export function createTier2Runner(deps?: {
	config?: Tier2Config | null;
	fetchImpl?: typeof fetch;
	timeoutMs?: number;
	onDiagnostic?: (diagnostic: Tier2Diagnostic) => void;
}): TierRunner {
	// Emit a diagnostic best-effort; a faulty collector must never break escalation.
	const emit = (diagnostic: Tier2Diagnostic): void => {
		try {
			deps?.onDiagnostic?.(diagnostic);
		} catch {
			/* swallow: diagnostics are a side channel, never load-bearing */
		}
	};

	return async ({ set, question }) => {
		const config =
			deps && "config" in deps ? deps.config : resolveTier2ConfigFromEnv();
		if (!config) {
			emit({ tier: 2, reason: "unconfigured" });
			return null;
		}

		const { url, init } = buildTier2Request(set, question, config);
		const f = deps?.fetchImpl ?? fetch;

		// Bound the call with an AbortSignal timeout when configured. Build a fresh
		// init (do NOT mutate buildTier2Request's pure output) carrying the signal.
		const timeoutMs = deps?.timeoutMs;
		const requestInit: RequestInit =
			typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0
				? { ...init, signal: AbortSignal.timeout(timeoutMs) }
				: init;

		try {
			const res = await f(url, requestInit);
			if (!res.ok) {
				emit({ tier: 2, reason: "http-error", httpStatus: res.status });
				return null;
			}
			const json: unknown = await res.json();
			const answer = parseTier2Answer(json);
			if (answer === null) {
				emit({ tier: 2, reason: "empty-answer" });
				return null;
			}
			return {
				tier: 2,
				content: [{ type: "text", text: answer }],
				details: { tier: 2, model: config.model },
			};
		} catch (err) {
			// A timeout fires as an AbortError/TimeoutError DOMException; everything
			// else (fetch/res.json rejection) is a network error. Both still escalate.
			const name = (err as { name?: unknown })?.name;
			if (name === "TimeoutError" || name === "AbortError") {
				emit({ tier: 2, reason: "timeout" });
			} else {
				emit({ tier: 2, reason: "network-error", message: shortErrorMessage(err) });
			}
			return null;
		}
	};
}
