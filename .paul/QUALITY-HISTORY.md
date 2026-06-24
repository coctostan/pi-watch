# Quality History

Per-plan quality delta appended during UNIFY by WALT (post-unify). One row per plan.

| Plan | Date | Command | Tests (before→after) | Lint | Typecheck | Delta | Notes |
|------|------|---------|----------------------|------|-----------|-------|-------|
| 01-01 | 2026-06-18 | — | skipped | skipped | skipped | — | No test/lint/typecheck runner detected (no package.json); research spike. No metrics. |
| 03-01 | 2026-06-18 | npm test | 12→38 pass | — | pass (exit 0) | ▲ improved (+26 tests) | Pure sampler core; 26 new deterministic specs (RED→GREEN→REFACTOR); no lint runner configured; 0 vulns; no new deps. |
| 03-02 | 2026-06-18 | npm test | 38→48 pass | — | pass (exit 0) | ▲ improved (+10 tests) | Effect boundary + sample() entry point; 10 new specs (pure parsers + ffmpeg-lavfi golden-clip round-trip); build exit 0; no lint runner configured; 0 vulns; no new deps. |
| 04-01 | 2026-06-18 | npm test | 48→64 pass | — | pass (exit 0) | ▲ improved (+16 tests) | Pure router (tier-selection decision unit); 16 new deterministic route-asserting specs (AC-1..AC-5); no lint runner configured; 0 vulns; no new deps. |
| 06-02 | 2026-06-19 | npm test | 77→93 pass | — | pass (exit 0) | ▲ improved (+16 tests) | Tier-2 OpenAI-compat video adapter (src/watch/tier2.ts); 16 new specs (pure builder/parser + env bridge + injected-fetch runner + walk integration); build exit 0; no lint runner configured; 0 vulns; 0 new deps. |
| 09-01 | 2026-06-22 | npm test | 117→125 pass | — | pass (exit 0) | ▲ improved (+8 tests) | `watch_batch` batching core/tool; typecheck/build clean; npm audit 0 vulns; no new deps; Socket checks passing. |
| 10-01 | 2026-06-24 | npm test | 125→125 pass | — | pass (exit 0) | ● stable | Docs-only local tier-2 setup runbook; typecheck/build clean; npm audit 0 vulns; no source/package changes; mlx_vlm smoke verified separately (HTTP 200 CONTENT red). |
| 11-01 | 2026-06-24 | npm test | 125→125 pass (+1 skipped live opt-in) | — | pass (exit 0) | ● stable | Opt-in live tier-2 proof added; default `npm test` skips live model test; live proof passed against local Qwen3-VL; build exit 0; npm audit 0 vulns; no new deps. |
| 12-01 | 2026-06-24 | npm test | 125→139 pass (+1 skipped live opt-in) | — | pass (exit 0) | ▲ improved (+14 tests) | Tier-2 failure diagnostics (Tier2Diagnostic via onDiagnostic side channel → details.tier2); option-a boundary collector left tier-runner.ts unchanged; typecheck/build clean; npm audit 0 vulns; no new deps. |
