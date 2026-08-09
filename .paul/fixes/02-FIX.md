---
phase: no-active-phase
plan: 02
type: fix
wave: 1
depends_on: []
files_modified: [package.json, package-lock.json, src/watch/extension.ts, src/watch/tier-runner.ts, test/watch/extension.test.ts, test/watch/tier-runner.test.ts, dist/watch/extension.*, dist/watch/tier-runner.*]
autonomous: true
---

<objective>
## Fix
Align the installed Pi package and custom tools with current Pi extension/package specifications while preserving watch behavior.
</objective>

<tasks>

<task type="auto">
  <name>Fix: Pi package and tool-spec compliance</name>
  <files>package.json, package-lock.json, src/watch/extension.ts, src/watch/tier-runner.ts, test/watch/extension.test.ts, test/watch/tier-runner.test.ts, dist/watch/extension.*, dist/watch/tier-runner.*</files>
  <action>
- Declare Pi-bundled runtime packages as `peerDependencies` with `"*"`, retaining pinned development dependencies needed for local build/test.
- Replace literal-union resolution schemas with `StringEnum` for Google-compatible tool schemas.
- Signal execution failures according to Pi semantics by throwing from `execute`, and update boundary tests.
- Bound final aggregate tool-result text to Pi's documented 50 KB / 2,000-line limits, including large transcripts/questions and appended guidance, while preserving required hints and complete frame-label/image pairs.
- Rebuild committed `dist/**` output from source.
  </action>
  <verify>Run focused watch tests, full tests, typecheck, build, a clean rebuild reproducibility check, and an explicit Pi package-load/watch invocation.</verify>
  <done>Package loads through Pi, watch executes, current schema/error/output requirements are covered by tests, and all quality gates pass.</done>
</task>

</tasks>

<verification>
- [x] Fix applied and verified
- [x] No regressions introduced
</verification>
