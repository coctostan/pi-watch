---
phase: no-active-phase
plan: 04
type: fix
wave: 1
depends_on: []
chain_node: "R7 — no spec impact"
files_modified: [package.json, package-lock.json, test/watch/asr-e2e.test.ts, README.md, docs/YOUTUBE-SETUP.md, docs/LOCAL-ASR-SETUP.md]
autonomous: true
---

<objective>
## Fix
Refresh development and packaging compatibility for Pi 1.0.0, npm 12, and current host Node prerequisites without changing watch behavior or adding runtime dependencies.

User approval: "ok, then proceed with the fix" after compatibility review against Pi 1.0.0.
Chain proposal: `R7 — no spec impact`, citing `.paul/PRD.md` R7; the typed config surface, tier ordering, and transcript policy remain unchanged.
Mode: standard `/paul:fix` compressed PLAN → APPLY → UNIFY side loop. Main milestone position remains unchanged.
</objective>

<tasks>
<task type="auto">
  <name>Fix: Pi 1.0 maintenance and npm packaging compatibility</name>
  <files>package.json, package-lock.json, test/watch/asr-e2e.test.ts, README.md, docs/YOUTUBE-SETUP.md, docs/LOCAL-ASR-SETUP.md; regenerate dist only if emitted output changes</files>
  <action>
- Update existing Pi development dependencies to 1.0.0 and existing test/development/transitive dependencies as needed to resolve advisories, retaining wildcard host peers and no runtime dependencies.
- Keep TypeScript on the existing compatible 5.x line and Vitest on the existing 4.x line; no unnecessary major tooling migration.
- Accept both legacy array and npm 12 keyed-object `npm pack --json` output in the packaging assertion, with deterministic coverage of both forms.
- Align package engine and user-facing prerequisites with current Pi's Node >=22.19.0 requirement.
- Rebuild committed dist output and verify the actual Pi 1.0.0 loader.
- Keep optional cancellation plumbing and new codemode features out of scope.
  </action>
  <verify>Focused tests, full offline suite, typecheck, build, reproducible dist, development and production audit, actual Pi 1.0.0 compiled-extension load, git diff --check.</verify>
  <done>All deterministic tests pass without excluding the packaging test, host load is clean, audit changes are evidenced, and workflow summary records actual results and module reports.</done>
</task>
</tasks>

<baseline>
- Installed Pi: 1.0.0; npm: 12.1.0; Node: 26.7.0.
- Full suite: 361 passed / 1 failed / 3 default-skipped. Failure: `test/watch/asr-e2e.test.ts:381`, legacy array assumption for npm pack JSON.
- Pi 1.0.0 alias compatibility run: 361 passed / 4 skipped (known packaging failure explicitly excluded plus three default-skipped live tests); typecheck and actual compiled host load passed.
- Audit: 0 critical / 4 high / 4 moderate / 0 low; production-only audit zero.
- Git: feature branch `fix/pi-1-maintenance`; unrelated `.codegraph/` remains untracked and excluded.
</baseline>

<verification>
- [x] Fix applied and verified
- [x] No regressions introduced
</verification>
