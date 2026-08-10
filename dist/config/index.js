/**
 * pi-watch config — public surface.
 *
 * The typed config surface (DESIGN.md §4, Phase 7): one pure `resolveWatchConfig`
 * resolver that turns the environment (+ optional explicit overrides) into a
 * `WatchConfig` the `watch` tool's effect boundary consumes. Precedence is
 * explicit overrides > env > built-in defaults. This replaces the raw
 * `WATCH_TIER2_*` env bridge as the tool's configuration composition point.
 */
export { resolveWatchConfig, DEFAULT_BUDGET, DEFAULT_RESOLUTION, DEFAULT_FETCH_TIMEOUT_MS, DEFAULT_LOCAL_ASR_EXECUTABLE, DEFAULT_LOCAL_ASR_MODEL, DEFAULT_LOCAL_ASR_MAX_DURATION_MS, DEFAULT_LOCAL_ASR_TIMEOUT_MS, MAX_LOCAL_ASR_DURATION_MS, MAX_LOCAL_ASR_TIMEOUT_MS, } from "./config.js";
//# sourceMappingURL=index.js.map