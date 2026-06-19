import { describe, it, expect } from "vitest";
import {
	resolveWatchConfig,
	DEFAULT_BUDGET,
	DEFAULT_RESOLUTION,
	DEFAULT_FETCH_TIMEOUT_MS,
	type WatchConfig,
} from "../../src/config/index.js";
import type { Tier2Config } from "../../src/watch/index.js";

/**
 * Deterministic specs for the typed config surface (Phase 7, AC-1). The resolver
 * is PURE: every spec passes a hand-built `env` object — the real process.env is
 * never read or mutated. Precedence under test: explicit overrides > env > defaults.
 */

const FULL_ENV: NodeJS.ProcessEnv = {
	WATCH_TIER2_BASE_URL: "http://localhost:8080/v1",
	WATCH_TIER2_MODEL: "qwen",
	WATCH_TIER2_API_KEY: "sk-secret",
	WATCH_BUDGET: "24",
	WATCH_RESOLUTION: "high",
	WATCH_TIER2_TIMEOUT_MS: "5000",
};

describe("resolveWatchConfig — defaults (empty env)", () => {
	it("falls back to built-in defaults and a null tier2 when nothing is set", () => {
		const cfg = resolveWatchConfig({});
		expect(cfg).toEqual<WatchConfig>({
			tier2: null,
			budget: DEFAULT_BUDGET,
			resolution: DEFAULT_RESOLUTION,
			fetchTimeoutMs: DEFAULT_FETCH_TIMEOUT_MS,
		});
	});
});

describe("resolveWatchConfig — tier2 mapping (AC-1)", () => {
	it("maps base URL + model (apiKey optional)", () => {
		expect(
			resolveWatchConfig({
				WATCH_TIER2_BASE_URL: "http://localhost:8080/v1",
				WATCH_TIER2_MODEL: "qwen",
			}).tier2,
		).toEqual({ baseURL: "http://localhost:8080/v1", model: "qwen" });

		expect(resolveWatchConfig(FULL_ENV).tier2).toEqual({
			baseURL: "http://localhost:8080/v1",
			model: "qwen",
			apiKey: "sk-secret",
		});
	});

	it("is null (unconfigured) when either required tier2 value is missing", () => {
		expect(resolveWatchConfig({ WATCH_TIER2_MODEL: "qwen" }).tier2).toBeNull();
		expect(
			resolveWatchConfig({ WATCH_TIER2_BASE_URL: "http://x/v1" }).tier2,
		).toBeNull();
	});
});

describe("resolveWatchConfig — env values (AC-1)", () => {
	it("reads budget / resolution / fetchTimeoutMs from a fully-populated env", () => {
		const cfg = resolveWatchConfig(FULL_ENV);
		expect(cfg.budget).toBe(24);
		expect(cfg.resolution).toBe("high");
		expect(cfg.fetchTimeoutMs).toBe(5000);
	});

	it("ignores malformed env values and falls back to defaults", () => {
		const cfg = resolveWatchConfig({
			WATCH_BUDGET: "abc",
			WATCH_RESOLUTION: "medium",
			WATCH_TIER2_TIMEOUT_MS: "-100",
		});
		expect(cfg.budget).toBe(DEFAULT_BUDGET);
		expect(cfg.resolution).toBe(DEFAULT_RESOLUTION);
		expect(cfg.fetchTimeoutMs).toBe(DEFAULT_FETCH_TIMEOUT_MS);
	});

	it("rejects non-integer / zero budget and timeout", () => {
		expect(resolveWatchConfig({ WATCH_BUDGET: "1.5" }).budget).toBe(DEFAULT_BUDGET);
		expect(resolveWatchConfig({ WATCH_BUDGET: "0" }).budget).toBe(DEFAULT_BUDGET);
		expect(
			resolveWatchConfig({ WATCH_TIER2_TIMEOUT_MS: "0" }).fetchTimeoutMs,
		).toBe(DEFAULT_FETCH_TIMEOUT_MS);
	});
});

describe("resolveWatchConfig — precedence: overrides > env > defaults (AC-1)", () => {
	it("lets explicit overrides win over env for every field", () => {
		const override: Tier2Config = { baseURL: "http://o/v1", model: "override-model" };
		const cfg = resolveWatchConfig(FULL_ENV, {
			tier2: override,
			budget: 99,
			resolution: "low",
			fetchTimeoutMs: 1234,
		});
		expect(cfg.tier2).toEqual(override);
		expect(cfg.budget).toBe(99);
		expect(cfg.resolution).toBe("low");
		expect(cfg.fetchTimeoutMs).toBe(1234);
	});

	it("honors an explicit tier2: null override even when env configures tier 2", () => {
		const cfg = resolveWatchConfig(FULL_ENV, { tier2: null });
		expect(cfg.tier2).toBeNull();
		// other fields still resolve from env
		expect(cfg.budget).toBe(24);
	});

	it("uses env when overrides omits a field (env beats defaults)", () => {
		const cfg = resolveWatchConfig(FULL_ENV, { budget: 7 });
		expect(cfg.budget).toBe(7); // override
		expect(cfg.resolution).toBe("high"); // env
		expect(cfg.fetchTimeoutMs).toBe(5000); // env
	});
});
