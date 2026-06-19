/**
 * config.ts — the typed config surface for the `watch` tool (DESIGN.md §4, Phase 7).
 *
 * This module REPLACES the raw `WATCH_TIER2_*` env bridge as the composition
 * point for the tool's configuration. It resolves, in one typed `WatchConfig`:
 *   - the tier-2 endpoint (`baseURL` + `model id`, optional `apiKey`), or `null`
 *     when unconfigured (tier 2 escalates to tier 3);
 *   - the default frame `budget` and `resolution` applied when a tool call gives
 *     no per-call override;
 *   - the tier-2 `fetchTimeoutMs` that bounds the network call.
 *
 * Precedence (highest wins): explicit `overrides` > environment > built-in defaults.
 *
 * Pure core / explicit effects (AGENTS.md): `resolveWatchConfig` is a PURE
 * function — it reads ONLY the `env` argument and performs no I/O. The single
 * real env effect happens at the extension boundary, which passes `process.env`
 * in. The adapter stays "baseURL + model id" (DESIGN §4); there are no per-model
 * code forks and cloud (e.g. Gemini) is optional, never required.
 *
 * Deferred (recorded, not lost): file-based config (e.g. a `watch.config.json`)
 * and a tier-order override are out of scope for this phase.
 */

import type { ResolutionTier } from "../contract/index.js";
import {
	type Tier2Config,
	resolveTier2ConfigFromEnv,
} from "../watch/tier2.js";

/** Default frame budget when no per-call override is given (aligns with the sampler's ~16 default). */
export const DEFAULT_BUDGET = 16;
/** Default frame resolution when no per-call override is given (DESIGN §3: low unless OCR-ish). */
export const DEFAULT_RESOLUTION: ResolutionTier = "low";
/** Default tier-2 fetch timeout in milliseconds. */
export const DEFAULT_FETCH_TIMEOUT_MS = 60000;

/**
 * The fully-resolved configuration the `watch` tool runs with. Produced by
 * `resolveWatchConfig`; consumed at the extension boundary.
 */
export interface WatchConfig {
	/** Resolved tier-2 endpoint, or `null` when unconfigured (tier 2 escalates). */
	tier2: Tier2Config | null;
	/** Default frame budget applied when a tool call gives no `budget`. */
	budget: number;
	/** Default frame resolution applied when a tool call gives no `resolution`. */
	resolution: ResolutionTier;
	/** Tier-2 `fetch` timeout in milliseconds (bounds the network call). */
	fetchTimeoutMs: number;
}

/** Parse a positive integer from an env string; returns null on absent/non-numeric/≤0. */
function parsePositiveInt(raw: string | undefined): number | null {
	if (raw === undefined) return null;
	const trimmed = raw.trim();
	if (trimmed === "") return null;
	const n = Number(trimmed);
	if (!Number.isInteger(n) || n <= 0) return null;
	return n;
}

/** Accept only the two valid resolution literals; returns null otherwise. */
function parseResolution(raw: string | undefined): ResolutionTier | null {
	const v = raw?.trim();
	return v === "low" || v === "high" ? v : null;
}

/**
 * Resolve the typed `WatchConfig` from the environment, with optional explicit
 * overrides. Pure and total: reads only `env`, performs no I/O, and never throws
 * on malformed input (bad values fall back to the next precedence level).
 *
 * Precedence per field: `overrides` > env > default.
 *   - tier2:          overrides.tier2 (incl. explicit `null`) else `resolveTier2ConfigFromEnv(env)`.
 *   - budget:         overrides.budget else `WATCH_BUDGET` (positive int) else `DEFAULT_BUDGET`.
 *   - resolution:     overrides.resolution else `WATCH_RESOLUTION` ("low"|"high") else `DEFAULT_RESOLUTION`.
 *   - fetchTimeoutMs: overrides.fetchTimeoutMs else `WATCH_TIER2_TIMEOUT_MS` (positive int) else `DEFAULT_FETCH_TIMEOUT_MS`.
 */
export function resolveWatchConfig(
	env: NodeJS.ProcessEnv = process.env,
	overrides?: Partial<WatchConfig>,
): WatchConfig {
	const tier2 =
		overrides && "tier2" in overrides
			? (overrides.tier2 as Tier2Config | null)
			: resolveTier2ConfigFromEnv(env);

	const budget =
		overrides?.budget !== undefined
			? overrides.budget
			: (parsePositiveInt(env.WATCH_BUDGET) ?? DEFAULT_BUDGET);

	const resolution =
		overrides?.resolution !== undefined
			? overrides.resolution
			: (parseResolution(env.WATCH_RESOLUTION) ?? DEFAULT_RESOLUTION);

	const fetchTimeoutMs =
		overrides?.fetchTimeoutMs !== undefined
			? overrides.fetchTimeoutMs
			: (parsePositiveInt(env.WATCH_TIER2_TIMEOUT_MS) ?? DEFAULT_FETCH_TIMEOUT_MS);

	return { tier2, budget, resolution, fetchTimeoutMs };
}
