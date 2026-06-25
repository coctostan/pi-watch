import { describe, it, expect } from "vitest";
import {
	walkTierChain,
	defaultRunners,
	createTier2Runner,
	TIER2_UNCONFIGURED_HINT,
	type TierRunner,
	type Tier2Diagnostic,
} from "../../src/watch/index.js";
import { withUnconfiguredHint } from "../../src/watch/extension.js";
import type { Tier, RoutingDecision } from "../../src/router/index.js";
import type { WatchedFrame, WatchedFrameSet } from "../../src/contract/index.js";

/**
 * Boundary specs (Phase 13, AC-1 / AC-2 / AC-4): prove the single-video `watch`
 * result surfaces the human-facing TIER2_UNCONFIGURED_HINT exactly when tier 2
 * was unconfigured AND another tier answered — and stays silent otherwise.
 *
 * Pure: the tier-2 runner is exercised with an INJECTED fetch (no live model,
 * no ffmpeg); the unconfigured case forces `config: null` so the runner emits
 * `{ tier: 2, reason: "unconfigured" }` before any network call.
 */

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

function makeSet(): WatchedFrameSet {
	return {
		source: {
			ref: "fixture.mp4",
			durationMs: 10_000,
			fpsSampled: 1,
			frameCount: 1,
			transcriptSource: "none",
		},
		frames: [frame()],
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

function fakeFetch(opts: {
	ok?: boolean;
	status?: number;
	json?: unknown;
	throws?: boolean;
}): typeof fetch {
	return (async () => {
		if (opts.throws) throw new Error("network down");
		return {
			ok: opts.ok ?? true,
			status: opts.status ?? 200,
			json: async () => opts.json ?? {},
		};
	}) as unknown as typeof fetch;
}

/**
 * Mirror the single-video `watch` execute composition: fresh diagnostic
 * collector + tier-2 runner, then surface the hint on the result content.
 * `tier2Config` defaults to `null` (unconfigured) so the runner escalates
 * without any network call; pass a config to exercise a configured tier 2.
 */
async function runWatchContent(
	tiers: RoutingDecision["tiers"],
	opts: {
		tier2Config?: Parameters<typeof createTier2Runner>[0] extends infer D
			? D extends { config?: infer C }
				? C
				: never
			: never;
		fetchImpl?: typeof fetch;
		tier3Override?: TierRunner;
	} = {},
) {
	let tier2Diagnostic: Tier2Diagnostic | undefined;
	const runners: Record<Tier, TierRunner> = {
		...defaultRunners,
		2: createTier2Runner({
			config: "tier2Config" in opts ? opts.tier2Config : null,
			fetchImpl: opts.fetchImpl ?? fakeFetch({ throws: true }),
			onDiagnostic: (d) => {
				tier2Diagnostic = d;
			},
		}),
		...(opts.tier3Override ? { 3: opts.tier3Override } : {}),
	};
	const result = await walkTierChain({
		set: makeSet(),
		decision: decision(tiers),
		question: "q",
		runners,
	});
	return {
		tier: result.tier,
		content: withUnconfiguredHint(result.content, result.tier, tier2Diagnostic),
	};
}

describe("withUnconfiguredHint — watch content surfacing (Phase 13)", () => {
	it("appends the hint when tier 2 is unconfigured and tier 3 answers (AC-1)", async () => {
		const { tier, content } = await runWatchContent([2, 3]);
		expect(tier).toBe(3);
		const last = content[content.length - 1];
		expect(last).toEqual({ type: "text", text: TIER2_UNCONFIGURED_HINT });
		// original tier-3 answer content is preserved ahead of the guidance line
		expect(content.length).toBeGreaterThan(1);
		expect(content[0]).not.toEqual({ type: "text", text: TIER2_UNCONFIGURED_HINT });
	});

	it("does NOT append the hint when tier 2 answers (final tier === 2) (AC-2)", async () => {
		const { tier, content } = await runWatchContent([2, 3], {
			tier2Config: {
				baseURL: "http://localhost:8080/v1",
				model: "mlx-community/Qwen3-VL-8B-Instruct-4bit",
			},
			fetchImpl: fakeFetch({ json: { choices: [{ message: { content: "real answer" } }] } }),
		});
		expect(tier).toBe(2);
		expect(content).not.toContainEqual({ type: "text", text: TIER2_UNCONFIGURED_HINT });
	});

	it("does NOT append the hint on a non-unconfigured failure (http-error) (AC-2)", async () => {
		const { tier, content } = await runWatchContent([2, 3], {
			tier2Config: {
				baseURL: "http://localhost:8080/v1",
				model: "mlx-community/Qwen3-VL-8B-Instruct-4bit",
			},
			fetchImpl: fakeFetch({ ok: false, status: 500 }),
		});
		expect(tier).toBe(3);
		expect(content).not.toContainEqual({ type: "text", text: TIER2_UNCONFIGURED_HINT });
	});

	it("does NOT append the hint on a non-unconfigured failure (network-error) (AC-2)", async () => {
		const { tier, content } = await runWatchContent([2, 3], {
			tier2Config: {
				baseURL: "http://localhost:8080/v1",
				model: "mlx-community/Qwen3-VL-8B-Instruct-4bit",
			},
			fetchImpl: fakeFetch({ throws: true }),
		});
		expect(tier).toBe(3);
		expect(content).not.toContainEqual({ type: "text", text: TIER2_UNCONFIGURED_HINT });
	});

	it("the guidance message carries no secret material (AC-4)", () => {
		expect(TIER2_UNCONFIGURED_HINT).not.toMatch(/Bearer|sk-|api[_-]?key\s*[:=]/i);
		expect(TIER2_UNCONFIGURED_HINT).toContain("WATCH_TIER2_BASE_URL");
		expect(TIER2_UNCONFIGURED_HINT).toContain("WATCH_TIER2_MODEL");
	});

	it("is pure: never mutates the input content array", () => {
		const input = [{ type: "text" as const, text: "answer" }];
		const diagnostic: Tier2Diagnostic = { tier: 2, reason: "unconfigured" };
		const out = withUnconfiguredHint(input, 3, diagnostic);
		expect(input).toHaveLength(1); // unchanged
		expect(out).toHaveLength(2);
	});
});
