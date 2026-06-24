import { describe, it, expect } from "vitest";
import {
	walkTierChain,
	defaultRunners,
	createTier2Runner,
	type TierRunner,
	type Tier2Config,
	type Tier2Diagnostic,
} from "../../src/watch/index.js";
import { withTier2Diagnostic } from "../../src/watch/extension.js";
import type { Tier, RoutingDecision } from "../../src/router/index.js";
import type { WatchedFrame, WatchedFrameSet } from "../../src/contract/index.js";

/**
 * Boundary specs (AC-3): prove the tier-2 failure diagnostic collected by the
 * runner's onDiagnostic side channel reaches the tool-result `details` when
 * tier 3 answers, and is ABSENT when tier 2 answers — exactly the merge the
 * extension boundary performs for `watch` and `watch_batch` (option-a, Phase 12).
 *
 * The runner is exercised with an INJECTED fetch: no live model, no ffmpeg.
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

const CONFIG: Tier2Config = {
	baseURL: "http://localhost:8080/v1",
	model: "mlx-community/Qwen3-VL-8B-Instruct-4bit",
};

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

/** Mirror the extension's per-call composition: fresh collector + tier-2 runner. */
async function runWithDiagnostics(
	fetchImpl: typeof fetch,
	tiers: RoutingDecision["tiers"],
	tier3Override?: TierRunner,
): Promise<Record<string, unknown>> {
	let tier2Diagnostic: Tier2Diagnostic | undefined;
	const runners: Record<Tier, TierRunner> = {
		...defaultRunners,
		2: createTier2Runner({
			config: CONFIG,
			fetchImpl,
			onDiagnostic: (d) => {
				tier2Diagnostic = d;
			},
		}),
		...(tier3Override ? { 3: tier3Override } : {}),
	};
	const d = decision(tiers);
	const result = await walkTierChain({
		set: makeSet(),
		decision: d,
		question: "q",
		runners,
	});
	return withTier2Diagnostic(
		{
			tier: result.tier,
			intent: d.intent,
			resolution: d.resolution,
			tiers: d.tiers,
			rationale: d.rationale,
			frameCount: 1,
			transcriptSource: "none",
		},
		result.tier,
		tier2Diagnostic,
	);
}

describe("watch details — tier-2 diagnostic surfacing (AC-3)", () => {
	it("records details.tier2 when tier 2 fails and tier 3 answers", async () => {
		const details = await runWithDiagnostics(
			fakeFetch({ ok: false, status: 500 }),
			[2, 3],
		);
		expect(details.tier).toBe(3);
		expect(details.tier2).toEqual({ tier: 2, reason: "http-error", httpStatus: 500 });
	});

	it("records details.tier2 reason 'network-error' on a fetch rejection", async () => {
		const details = await runWithDiagnostics(fakeFetch({ throws: true }), [2, 3]);
		expect(details.tier).toBe(3);
		expect(details.tier2).toMatchObject({ tier: 2, reason: "network-error" });
	});

	it("records NO failure diagnostic when tier 2 answers (final tier === 2)", async () => {
		const details = await runWithDiagnostics(
			fakeFetch({ json: { choices: [{ message: { content: "real answer" } }] } }),
			[2, 3],
		);
		expect(details.tier).toBe(2);
		expect(details.tier2).toBeUndefined();
	});

	it("preserves the existing details fields alongside the diagnostic", async () => {
		const details = await runWithDiagnostics(
			fakeFetch({ ok: false, status: 503 }),
			[2, 3],
		);
		expect(details).toMatchObject({
			tier: 3,
			intent: "visual",
			resolution: "low",
			tiers: [2, 3],
			rationale: "fixture",
			frameCount: 1,
			transcriptSource: "none",
		});
		expect(details.tier2).toEqual({ tier: 2, reason: "http-error", httpStatus: 503 });
	});

	it("never leaks the api key into details.tier2", async () => {
		const SECRET = "sk-secret-123";
		let tier2Diagnostic: Tier2Diagnostic | undefined;
		const runner = createTier2Runner({
			config: { ...CONFIG, apiKey: SECRET },
			fetchImpl: fakeFetch({ throws: true }),
			onDiagnostic: (d) => {
				tier2Diagnostic = d;
			},
		});
		await runner({ set: makeSet(), decision: decision([2, 3]), question: "q" });
		const details = withTier2Diagnostic({ tier: 3 }, 3, tier2Diagnostic);
		expect(JSON.stringify(details)).not.toContain(SECRET);
	});
});
