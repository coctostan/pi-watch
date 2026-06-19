# Quality History

Per-plan quality delta appended during UNIFY by WALT (post-unify). One row per plan.

| Plan | Date | Command | Tests (before→after) | Lint | Typecheck | Delta | Notes |
|------|------|---------|----------------------|------|-----------|-------|-------|
| 01-01 | 2026-06-18 | — | skipped | skipped | skipped | — | No test/lint/typecheck runner detected (no package.json); research spike. No metrics. |
| 03-01 | 2026-06-18 | npm test | 12→38 pass | — | pass (exit 0) | ▲ improved (+26 tests) | Pure sampler core; 26 new deterministic specs (RED→GREEN→REFACTOR); no lint runner configured; 0 vulns; no new deps. |
| 03-02 | 2026-06-18 | npm test | 38→48 pass | — | pass (exit 0) | ▲ improved (+10 tests) | Effect boundary + sample() entry point; 10 new specs (pure parsers + ffmpeg-lavfi golden-clip round-trip); build exit 0; no lint runner configured; 0 vulns; no new deps. |
| 04-01 | 2026-06-18 | npm test | 48→64 pass | — | pass (exit 0) | ▲ improved (+16 tests) | Pure router (tier-selection decision unit); 16 new deterministic route-asserting specs (AC-1..AC-5); no lint runner configured; 0 vulns; no new deps. |
| 06-02 | 2026-06-19 | npm test | 77→93 pass | — | pass (exit 0) | ▲ improved (+16 tests) | Tier-2 OpenAI-compat video adapter (src/watch/tier2.ts); 16 new specs (pure builder/parser + env bridge + injected-fetch runner + walk integration); build exit 0; no lint runner configured; 0 vulns; 0 new deps. |
