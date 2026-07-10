import { describe, it, expect } from "vitest";
import {
	walkTierChain,
	defaultRunners,
	tier3Runner,
	createTier2Runner,
	buildTier2Request,
	parseTier2Answer,
	resolveTier2ConfigFromEnv,
	LOCAL_TIER2_BASE_URL,
	LOCAL_TIER2_MODEL,
	type TierRunner,
	type Tier2Config,
	type Tier2Diagnostic,
} from "../../src/watch/index.js";
import type { RoutingDecision } from "../../src/router/index.js";
import type { WatchedFrame, WatchedFrameSet } from "../../src/contract/index.js";

/**
 * Deterministic specs for the tier-2 OpenAI-compatible video adapter (AC-1,
 * AC-2, AC-3). No live model: the pure request-builder / response-parser are
 * tested directly, and the runner is exercised with an INJECTED `fetchImpl`.
 * All fixtures are hand-built in memory — no ffmpeg, no sample()/route().
 */

// ── Fixtures ──────────────────────────────────────────────────────────────────

function frame(overrides: Partial<WatchedFrame> = {}): WatchedFrame {
	return {
		index: 0,
		tMs: 0,
		timestamp: "00:00",
		imageBase64: "AAAA",
		mediaType: "image/png",
		resolution: "low",
		origin: "scene-cut",
		...overrides,
	};
}

const TWO_FRAMES: WatchedFrame[] = [
	frame({ index: 0, tMs: 0, timestamp: "00:00", imageBase64: "FRAME0" }),
	frame({
		index: 1,
		tMs: 5_000,
		timestamp: "00:05",
		imageBase64: "FRAME1",
		mediaType: "image/jpeg",
		origin: "backfill",
	}),
];

function makeSet(): WatchedFrameSet {
	return {
		source: {
			ref: "fixture.mp4",
			durationMs: 10_000,
			fpsSampled: 1,
			frameCount: TWO_FRAMES.length,
			transcriptSource: "none",
		},
		frames: TWO_FRAMES,
		transcript: [],
	};
}

function decision(tiers: RoutingDecision["tiers"]): RoutingDecision {
	return {
		intent: "visual",
		resolution: "low",
		tiers,
		primaryTier: tiers[0]!,
		rationale: "fixture",
	};
}

const CONFIG: Tier2Config = {
	baseURL: "http://localhost:8080/v1",
	model: "mlx-community/Qwen3-VL-8B-Instruct-4bit",
};

/** Build a fake `fetch` returning a chosen JSON body / ok flag, recording calls. */
function fakeFetch(opts: {
	ok?: boolean;
	status?: number;
	json?: unknown;
	throws?: boolean;
}): { impl: typeof fetch; calls: Array<[string, RequestInit | undefined]> } {
	const calls: Array<[string, RequestInit | undefined]> = [];
	const impl = (async (url: unknown, init?: unknown) => {
		calls.push([String(url), init as RequestInit | undefined]);
		if (opts.throws) throw new Error("network down");
		return {
			ok: opts.ok ?? true,
			status: opts.status ?? 200,
			json: async () => opts.json ?? {},
		};
	}) as unknown as typeof fetch;
	return { impl, calls };
}

// ── PURE buildTier2Request (AC-1) ─────────────────────────────────────────────

describe("buildTier2Request — pure wire-shape builder (AC-1)", () => {
	it("targets <baseURL>/chat/completions and strips a trailing slash", () => {
		const { url } = buildTier2Request(makeSet(), "q", {
			...CONFIG,
			baseURL: "http://localhost:8080/v1/",
		});
		expect(url).toBe("http://localhost:8080/v1/chat/completions");
	});

	it("POSTs the model id and a single user message in OpenAI shape", () => {
		const { init } = buildTier2Request(makeSet(), "What happens?", CONFIG);
		expect(init.method).toBe("POST");
		const body = JSON.parse(String(init.body));
		expect(body.model).toBe(CONFIG.model);
		expect(body.messages[0].role).toBe("user");
	});

	it("serializes frames as ordered image_url blocks plus text (via toOpenAIContent)", () => {
		const { init } = buildTier2Request(makeSet(), "What happens?", CONFIG);
		const body = JSON.parse(String(init.body));
		const content: Array<{ type: string; image_url?: { url: string } }> =
			body.messages[0].content;
		const images = content.filter((p) => p.type === "image_url");
		expect(images).toHaveLength(2);
		expect(images[0]!.image_url!.url).toMatch(/^data:image\/png;base64,FRAME0$/);
		expect(content.some((p) => p.type === "text")).toBe(true);
	});

	it("adds an Authorization: Bearer header only when apiKey is set", () => {
		const withKey = buildTier2Request(makeSet(), "q", { ...CONFIG, apiKey: "sk-secret" });
		expect((withKey.init.headers as Record<string, string>).Authorization).toBe(
			"Bearer sk-secret",
		);
		const withoutKey = buildTier2Request(makeSet(), "q", CONFIG);
		expect(
			(withoutKey.init.headers as Record<string, string>).Authorization,
		).toBeUndefined();
	});
});

// ── PURE parseTier2Answer (AC-1 / AC-2) ───────────────────────────────────────

describe("parseTier2Answer — pure response parser (AC-1/AC-2)", () => {
	it("returns the string content of a well-formed completion", () => {
		expect(
			parseTier2Answer({ choices: [{ message: { content: "red -> green -> blue" } }] }),
		).toBe("red -> green -> blue");
	});

	it("joins the text parts when content is an array", () => {
		expect(
			parseTier2Answer({
				choices: [
					{
						message: {
							content: [
								{ type: "text", text: "red " },
								{ type: "image_url", image_url: { url: "x" } },
								{ type: "text", text: "green" },
							],
						},
					},
				],
			}),
		).toBe("red green");
	});

	it("returns null for missing/empty/garbled responses", () => {
		expect(parseTier2Answer({})).toBeNull();
		expect(parseTier2Answer({ choices: [] })).toBeNull();
		expect(parseTier2Answer({ choices: [{ message: { content: "" } }] })).toBeNull();
		expect(parseTier2Answer({ choices: [{ message: { content: "   " } }] })).toBeNull();
		expect(parseTier2Answer({ choices: [{ message: {} }] })).toBeNull();
		expect(parseTier2Answer("nope")).toBeNull();
		expect(parseTier2Answer(null)).toBeNull();
	});
});

// ── resolveTier2ConfigFromEnv — env bridge ────────────────────────────────────

describe("resolveTier2ConfigFromEnv — env bridge", () => {
	it("returns a config when BASE_URL + MODEL are present (apiKey optional)", () => {
		expect(
			resolveTier2ConfigFromEnv({
				WATCH_TIER2_BASE_URL: "http://localhost:8080/v1",
				WATCH_TIER2_MODEL: "qwen",
			}),
		).toEqual({ baseURL: "http://localhost:8080/v1", model: "qwen" });

		expect(
			resolveTier2ConfigFromEnv({
				WATCH_TIER2_BASE_URL: "http://localhost:8080/v1",
				WATCH_TIER2_MODEL: "qwen",
				WATCH_TIER2_API_KEY: "k",
			}),
		).toEqual({ baseURL: "http://localhost:8080/v1", model: "qwen", apiKey: "k" });
	});

	it("returns null when either required value is missing or empty", () => {
		expect(resolveTier2ConfigFromEnv({ WATCH_TIER2_MODEL: "qwen" })).toBeNull();
		expect(
			resolveTier2ConfigFromEnv({ WATCH_TIER2_BASE_URL: "http://x/v1" }),
		).toBeNull();
		expect(
			resolveTier2ConfigFromEnv({
				WATCH_TIER2_BASE_URL: "  ",
				WATCH_TIER2_MODEL: "qwen",
			}),
		).toBeNull();
	});

	it("opt-in WATCH_TIER2_LOCAL=1 resolves the documented localhost default (AC-4)", () => {
		expect(resolveTier2ConfigFromEnv({ WATCH_TIER2_LOCAL: "1" })).toEqual({
			baseURL: LOCAL_TIER2_BASE_URL,
			model: LOCAL_TIER2_MODEL,
		});
	});

	it("stays null (network-free) when the local flag is unset or not exactly '1' (AC-3)", () => {
		expect(resolveTier2ConfigFromEnv({})).toBeNull();
		expect(resolveTier2ConfigFromEnv({ WATCH_TIER2_LOCAL: "0" })).toBeNull();
		expect(resolveTier2ConfigFromEnv({ WATCH_TIER2_LOCAL: "true" })).toBeNull();
		expect(resolveTier2ConfigFromEnv({ WATCH_TIER2_LOCAL: " 1 " })).toEqual({
			baseURL: LOCAL_TIER2_BASE_URL,
			model: LOCAL_TIER2_MODEL,
		}); // trimmed to "1"
	});

	it("explicit BASE_URL + MODEL take precedence over the local default (AC-4)", () => {
		expect(
			resolveTier2ConfigFromEnv({
				WATCH_TIER2_LOCAL: "1",
				WATCH_TIER2_BASE_URL: "http://explicit/v1",
				WATCH_TIER2_MODEL: "explicit-model",
			}),
		).toEqual({ baseURL: "http://explicit/v1", model: "explicit-model" });
	});

	it("applies an optional apiKey to the local default endpoint", () => {
		expect(
			resolveTier2ConfigFromEnv({ WATCH_TIER2_LOCAL: "1", WATCH_TIER2_API_KEY: "k" }),
		).toEqual({ baseURL: LOCAL_TIER2_BASE_URL, model: LOCAL_TIER2_MODEL, apiKey: "k" });
	});
});

// ── createTier2Runner with INJECTED fetch (AC-1 / AC-2) ───────────────────────

describe("createTier2Runner — effectful runner with injected transport", () => {
	it("resolves a tier-2 result on a well-formed response (AC-1)", async () => {
		const { impl } = fakeFetch({
			json: { choices: [{ message: { content: "red -> green -> blue" } }] },
		});
		const runner = createTier2Runner({ config: CONFIG, fetchImpl: impl });
		const result = await runner({
			set: makeSet(),
			decision: decision([2, 3]),
			question: "What order?",
		});
		expect(result?.tier).toBe(2);
		expect(result?.content).toEqual([{ type: "text", text: "red -> green -> blue" }]);
		expect(result?.details).toMatchObject({ tier: 2, model: CONFIG.model });
	});

	it("escalates (null) on a non-2xx status, having called fetch (AC-2)", async () => {
		const { impl, calls } = fakeFetch({ ok: false, status: 500 });
		const runner = createTier2Runner({ config: CONFIG, fetchImpl: impl });
		const result = await runner({
			set: makeSet(),
			decision: decision([2, 3]),
			question: "q",
		});
		expect(result).toBeNull();
		expect(calls).toHaveLength(1);
	});

	it("escalates (null) on a network error without throwing (AC-2)", async () => {
		const { impl } = fakeFetch({ throws: true });
		const runner = createTier2Runner({ config: CONFIG, fetchImpl: impl });
		await expect(
			runner({ set: makeSet(), decision: decision([2, 3]), question: "q" }),
		).resolves.toBeNull();
	});

	it("escalates (null) on an empty answer (AC-2)", async () => {
		const { impl } = fakeFetch({ json: { choices: [{ message: { content: "" } }] } });
		const runner = createTier2Runner({ config: CONFIG, fetchImpl: impl });
		const result = await runner({
			set: makeSet(),
			decision: decision([2, 3]),
			question: "q",
		});
		expect(result).toBeNull();
	});

	it("escalates (null) WITHOUT calling fetch when unconfigured (AC-2)", async () => {
		const { impl, calls } = fakeFetch({});
		const runner = createTier2Runner({ config: null, fetchImpl: impl });
		const result = await runner({
			set: makeSet(),
			decision: decision([2, 3]),
			question: "q",
		});
		expect(result).toBeNull();
		expect(calls).toHaveLength(0);
	});
});

// ── fetch timeout / abort (AC-3) ───────────────────────────────────────────────

describe("createTier2Runner — fetch timeout / abort (AC-3)", () => {
	it("passes an AbortSignal on init when timeoutMs is set", async () => {
		const { impl, calls } = fakeFetch({
			json: { choices: [{ message: { content: "ok" } }] },
		});
		const runner = createTier2Runner({ config: CONFIG, fetchImpl: impl, timeoutMs: 5000 });
		const result = await runner({
			set: makeSet(),
			decision: decision([2, 3]),
			question: "q",
		});
		expect(result?.tier).toBe(2);
		const init = calls[0]![1];
		expect(init?.signal).toBeInstanceOf(AbortSignal);
	});

	it("does NOT attach a signal when timeoutMs is omitted (no behaviour change)", async () => {
		const { impl, calls } = fakeFetch({
			json: { choices: [{ message: { content: "ok" } }] },
		});
		const runner = createTier2Runner({ config: CONFIG, fetchImpl: impl });
		const result = await runner({
			set: makeSet(),
			decision: decision([2, 3]),
			question: "q",
		});
		expect(result?.tier).toBe(2);
		expect(calls[0]![1]?.signal).toBeUndefined();
	});

	it("escalates (null) on an abort/timeout rejection without throwing (AC-3)", async () => {
		// Simulate a timeout: fetch rejects with an AbortError when a signal is present.
		const calls: Array<[string, RequestInit | undefined]> = [];
		const impl = (async (url: unknown, init?: unknown) => {
			calls.push([String(url), init as RequestInit | undefined]);
			if ((init as RequestInit | undefined)?.signal) {
				throw new DOMException("The operation was aborted", "AbortError");
			}
			return { ok: true, status: 200, json: async () => ({}) };
		}) as unknown as typeof fetch;
		const runner = createTier2Runner({ config: CONFIG, fetchImpl: impl, timeoutMs: 1 });
		await expect(
			runner({ set: makeSet(), decision: decision([2, 3]), question: "q" }),
		).resolves.toBeNull();
		expect(calls).toHaveLength(1);
	});
});

// ── walkTierChain integration (AC-1 / AC-2) ───────────────────────────────────

describe("walkTierChain — tier-2 integration", () => {
	it("resolves at tier 2 and does not invoke tier 3 when configured (AC-1)", async () => {
		const { impl } = fakeFetch({
			json: { choices: [{ message: { content: "an answer" } }] },
		});
		let tier3Invoked = false;
		const runners: Record<1 | 2 | 3, TierRunner> = {
			...defaultRunners,
			2: createTier2Runner({ config: CONFIG, fetchImpl: impl }),
			3: (args) => {
				tier3Invoked = true;
				return tier3Runner(args);
			},
		};
		const result = await walkTierChain({
			set: makeSet(),
			decision: decision([2, 3]),
			question: "q",
			runners,
		});
		expect(result.tier).toBe(2);
		expect(tier3Invoked).toBe(false);
	});

	it("falls through to tier 3 when tier 2 fails (AC-2)", async () => {
		const { impl } = fakeFetch({ ok: false, status: 502 });
		const runners: Record<1 | 2 | 3, TierRunner> = {
			...defaultRunners,
			2: createTier2Runner({ config: CONFIG, fetchImpl: impl }),
		};
		const result = await walkTierChain({
			set: makeSet(),
			decision: decision([2, 3]),
			question: "q",
			runners,
		});
		expect(result.tier).toBe(3);
	});
});

// ── onDiagnostic side channel (AC-1 / AC-2 / AC-4) ──────────────────────────────
//
// Phase 12: the runner emits a structured, secret-free Tier2Diagnostic right
// before each `return null`, WITHOUT changing the null-escalation contract or
// the success path. Each test captures via an injected onDiagnostic collector
// and asserts both the diagnostic AND that escalation/return is unchanged.

describe("createTier2Runner — onDiagnostic per failure reason (AC-1/AC-2)", () => {
	function collector(): {
		diagnostics: Tier2Diagnostic[];
		onDiagnostic: (d: Tier2Diagnostic) => void;
	} {
		const diagnostics: Tier2Diagnostic[] = [];
		return { diagnostics, onDiagnostic: (d) => diagnostics.push(d) };
	}

	it("emits reason 'unconfigured' and makes NO network call (AC-1/AC-2)", async () => {
		const { impl, calls } = fakeFetch({});
		const { diagnostics, onDiagnostic } = collector();
		const runner = createTier2Runner({ config: null, fetchImpl: impl, onDiagnostic });
		const result = await runner({
			set: makeSet(),
			decision: decision([2, 3]),
			question: "q",
		});
		expect(result).toBeNull();
		expect(calls).toHaveLength(0);
		expect(diagnostics).toEqual([{ tier: 2, reason: "unconfigured" }]);
	});

	it("emits reason 'http-error' with the numeric httpStatus (AC-1/AC-2)", async () => {
		const { impl, calls } = fakeFetch({ ok: false, status: 500 });
		const { diagnostics, onDiagnostic } = collector();
		const runner = createTier2Runner({ config: CONFIG, fetchImpl: impl, onDiagnostic });
		const result = await runner({
			set: makeSet(),
			decision: decision([2, 3]),
			question: "q",
		});
		expect(result).toBeNull();
		expect(calls).toHaveLength(1);
		expect(diagnostics).toEqual([{ tier: 2, reason: "http-error", httpStatus: 500 }]);
	});

	it("emits reason 'empty-answer' on an empty/garbled response (AC-1/AC-2)", async () => {
		const { impl } = fakeFetch({ json: { choices: [{ message: { content: "" } }] } });
		const { diagnostics, onDiagnostic } = collector();
		const runner = createTier2Runner({ config: CONFIG, fetchImpl: impl, onDiagnostic });
		const result = await runner({
			set: makeSet(),
			decision: decision([2, 3]),
			question: "q",
		});
		expect(result).toBeNull();
		expect(diagnostics).toEqual([{ tier: 2, reason: "empty-answer" }]);
	});

	it("emits reason 'timeout' on an abort/timeout rejection (AC-1/AC-2)", async () => {
		const impl = (async (_url: unknown, init?: unknown) => {
			if ((init as RequestInit | undefined)?.signal) {
				throw new DOMException("The operation was aborted", "AbortError");
			}
			return { ok: true, status: 200, json: async () => ({}) };
		}) as unknown as typeof fetch;
		const { diagnostics, onDiagnostic } = collector();
		const runner = createTier2Runner({
			config: CONFIG,
			fetchImpl: impl,
			timeoutMs: 1,
			onDiagnostic,
		});
		const result = await runner({
			set: makeSet(),
			decision: decision([2, 3]),
			question: "q",
		});
		expect(result).toBeNull();
		expect(diagnostics).toEqual([{ tier: 2, reason: "timeout" }]);
	});

	it("emits reason 'network-error' with a short message on a fetch rejection (AC-1/AC-2)", async () => {
		const { impl } = fakeFetch({ throws: true });
		const { diagnostics, onDiagnostic } = collector();
		const runner = createTier2Runner({ config: CONFIG, fetchImpl: impl, onDiagnostic });
		const result = await runner({
			set: makeSet(),
			decision: decision([2, 3]),
			question: "q",
		});
		expect(result).toBeNull();
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({ tier: 2, reason: "network-error" });
		expect(typeof diagnostics[0]!.message).toBe("string");
		expect(diagnostics[0]!.message).toContain("network down");
	});

	it("emits NO diagnostic on a successful tier-2 answer (AC-4)", async () => {
		const { impl } = fakeFetch({
			json: { choices: [{ message: { content: "an answer" } }] },
		});
		const { diagnostics, onDiagnostic } = collector();
		const runner = createTier2Runner({ config: CONFIG, fetchImpl: impl, onDiagnostic });
		const result = await runner({
			set: makeSet(),
			decision: decision([2, 3]),
			question: "q",
		});
		expect(result?.tier).toBe(2);
		expect(diagnostics).toEqual([]);
	});

	it("never leaks the api key or Authorization header into a diagnostic (SETH/AC-1)", async () => {
		const SECRET = "sk-super-secret-key";
		// An http-error AND a network-error path, both with an apiKey configured.
		for (const opts of [{ ok: false, status: 401 }, { throws: true }]) {
			const { impl } = fakeFetch(opts);
			const { diagnostics, onDiagnostic } = collector();
			const runner = createTier2Runner({
				config: { ...CONFIG, apiKey: SECRET },
				fetchImpl: impl,
				onDiagnostic,
			});
			await runner({ set: makeSet(), decision: decision([2, 3]), question: "q" });
			const serialized = JSON.stringify(diagnostics);
			expect(serialized).not.toContain(SECRET);
			expect(serialized.toLowerCase()).not.toContain("authorization");
		}
	});

	it("still escalates to tier 3 through walkTierChain while emitting a diagnostic (AC-2)", async () => {
		const { impl } = fakeFetch({ ok: false, status: 503 });
		const { diagnostics, onDiagnostic } = collector();
		const runners: Record<1 | 2 | 3, TierRunner> = {
			...defaultRunners,
			2: createTier2Runner({ config: CONFIG, fetchImpl: impl, onDiagnostic }),
		};
		const result = await walkTierChain({
			set: makeSet(),
			decision: decision([2, 3]),
			question: "q",
			runners,
		});
		expect(result.tier).toBe(3);
		expect(diagnostics).toEqual([{ tier: 2, reason: "http-error", httpStatus: 503 }]);
	});

	it("a throwing onDiagnostic never breaks escalation (AC-2)", async () => {
		const { impl } = fakeFetch({ ok: false, status: 500 });
		const runner = createTier2Runner({
			config: CONFIG,
			fetchImpl: impl,
			onDiagnostic: () => {
				throw new Error("collector blew up");
			},
		});
		await expect(
			runner({ set: makeSet(), decision: decision([2, 3]), question: "q" }),
		).resolves.toBeNull();
	});
});
