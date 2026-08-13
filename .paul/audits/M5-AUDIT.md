---
milestone: M5
trigger: milestone-close
status: complete
date: 2026-08-13T15:50:00Z
reviewer: code-reviewer (isolated, read-only)
---

# M5 Adherence Audit

Fresh-context reviewer: isolated read-only Codex reviewer (`codex-cli 0.146.1`, `--sandbox read-only`), dispatched against base `v0.4.0` with a clean audit mission containing no incumbent verdicts. Reviewer output is proposed evidence only; every verdict below was independently re-verified by the parent session against cited source before being written here.

Overall proposed verdict distribution: **21 HELD · 1 DRIFTED · 0 OBSOLETE** across stable IDs R1–R22.

## Requirement Adherence

| R# | Verdict | Evidence | Tagged acceptance evidence |
|----|---------|----------|----------------------------|
| R1 | HELD | Synchronous `registerTool` with prompt metadata in `src/watch/extension.ts`; external allowlist guidance in `README.md`. | no-test-found (nearest: `test/watch/extension.test.ts` registration cases) |
| R2 | HELD | Ordered frames, resolution/origin, transcript segments, duration/fps/source/range metadata and validator in `src/contract/watched-frame-set.ts`. | no-test-found (nearest: `test/contract/watched-frame-set.test.ts`) |
| R3 | HELD | Scene selection, range-relative backfill, absolute rebasing, budgeted decode, resolution policy, transcript merge in `src/sampler/sample.ts` and `src/sampler/select-frames.ts`. R3 text does not specify the normalization algorithm implicated in F2. | `[phase22][R3]` in `test/router/route.test.ts`, `test/sampler/assemble.test.ts`, `test/sampler/sample.test.ts`, `test/watch/extension.test.ts` |
| R4 | HELD | Deterministic spoken/broad/mixed/visual/OCR classification, ASR eligibility, ordered tiers terminating at tier 3 in `src/router/route.ts`. | `[phase22][R4]` Phase 22 surfaces plus `[phase23][R4]` in `test/router/route.test.ts` and `test/watch/context-efficiency.test.ts` |
| R5 | HELD | Whole-second conversion-safe bounds in `src/watch/extension.ts` tool schemas; one absolute half-open range resolved in `src/sampler/sample.ts`. | `[phase22][R5]` Phase 22 route/assembly/sample/extension surfaces |
| R6 | HELD | Tier 1 transcript delivery and tier 3 `ImageContent` in `src/watch/tier-runner.ts`; generic OpenAI-compatible sampled `image_url` adapter in `src/watch/tier2.ts`. | `[phase22][R6]`, `[phase23][R6]` in `test/watch/extension-unconfigured-hint.test.ts` and `test/watch/context-efficiency.test.ts` |
| R7 | HELD | Tier-2 endpoint/model, budget, resolution, fetch timeout, bounded local-ASR policy in `src/config/config.ts`. | no-test-found (nearest: `test/config/config.test.ts`) |
| R8 | **DRIFTED** | PRD R8 states variable expansion and nested quoting are "rejected with the usage string". `src/watch/command.ts` matches only the first closing quote and passes interior content through verbatim; `test/watch/command.test.ts:108` asserts `'$HOME/My Videos/demo.mov'` is **accepted** and delegated literally. Escapes (`\"`) and token concatenation (`'…'x`) *are* rejected (`test/watch/command.test.ts:94-106`). Parent verified: no shell execution occurs; the ref is interpolated into a `pi.sendUserMessage` prompt only. | `[phase23][R8]` in `test/watch/command.test.ts` — the tagged surface codifies the drift |
| R9 | HELD | `Promise.allSettled` fan-out with stable order, isolated failures, bounded aggregation in `src/watch/batch.ts`. | no-test-found (nearest: `test/watch/batch.test.ts`) |
| R10 | HELD | Tier-3 batch fan-out remains deferred; batch returns text-only follow-up guidance in `src/watch/extension.ts`. | no-test-found (nearest: `test/watch/batch.test.ts` tier-3 deferral) |
| R11 | HELD | No Gemini-specific path or dependency; hosted endpoints stay optional via generic `baseURL`+model in `src/watch/tier2.ts`. | no-test-found (nearest: `test/config/config.test.ts` explicit hosted endpoint) |
| R12 | HELD | No native-video ingestion; adapter serializes owner-sampled frames as `image_url` blocks in `src/watch/tier2.ts`. | no-test-found (nearest: `test/watch/tier2.test.ts` serialization) |
| R13 | HELD | Always-sample-every-frame remains absent; selection is capped and uniformly subsampled in `src/sampler/select-frames.ts`. See F4 on how R13 is cited elsewhere in the PRD. | no-test-found (nearest: `test/sampler/select-frames.test.ts` budget cap) |
| R14 | HELD | Empty configuration yields `tier2: null` with no mandatory cloud path in `src/config/config.ts`; tier 3 remains available. | no-test-found (nearest: `test/config/config.test.ts`, `test/watch/extension.test.ts` offline fallback) |
| R15 | HELD | No Ollama/native-video path; exclusion still recorded in `DESIGN.md`. | no-test-found (no direct negative assertion) |
| R16 | HELD | ASR gated on `WATCH_ASR_LOCAL === "1"` in `src/config/config.ts`; only spoken/mixed intent receives the policy in `src/watch/extension.ts`. | no-test-found (nearest: `test/config/config.test.ts`, `test/watch/extension.test.ts`) |
| R17 | HELD | Direct configured executable invoked with an argv array, validated JSON segments, no install/service work in `src/sampler/asr.ts`. | no-test-found (nearest: `test/sampler/asr.test.ts`) |
| R18 | HELD | Duration and timeout clamped to compiled ceilings before comparison, storage, or spawn in `src/sampler/asr.ts`; 16 MiB output bound retained. | `[phase23][R18]` in `test/sampler/asr.test.ts` |
| R19 | HELD | Closed typed diagnostic union carrying only reason plus bounded numeric fields in `src/sampler/asr.ts`. | no-test-found (nearest: `test/sampler/asr.test.ts` privacy cases) |
| R20 | HELD | Only the adapter-created output directory is removed in `src/sampler/asr.ts`; media and user caches are never cleanup targets. | no-test-found (nearest: `test/sampler/asr.test.ts` ownership cases) |
| R21 | HELD | Every process/output failure returns `source: "none"` in `src/sampler/asr.ts`, preserving the visual chain without fabricated text. | no-test-found (nearest: `test/watch/asr-e2e.test.ts` compiled fallback) |
| R22 | HELD | Compiled-registration proof uses a test-owned npm cache and validates the packed `dist` extension in `test/watch/asr-e2e.test.ts`; real-model proof stays exact-opt-in and default-skipped. | `[phase23][R22]` in `test/watch/asr-e2e.test.ts` and `test/watch/context-efficiency.test.ts` |

## Tagged Acceptance Evidence

| R# | Command | Exit | Result / no-test-found evidence |
|----|---------|------|---------------------------------|
| all | `npm test` | 0 | 20 files passed / 2 skipped; 362 tests passed / 3 skipped. Independently reproduced by the parent session. |
| all | `npm run typecheck` | 0 | `tsc -p tsconfig.test.json` clean. |
| all | `npm run build` | 0 | `tsc -p tsconfig.json` clean. |
| all | `git diff --exit-code -- dist` | 0 | Rebuilt `dist/**` byte-identical to committed output. |
| all | `git diff --check v0.4.0..HEAD` | 0 | No whitespace errors across the milestone range. |
| R3, R4, R5, R6 | `npx vitest run test/router/route.test.ts test/sampler/assemble.test.ts test/sampler/sample.test.ts test/watch/extension.test.ts` | 0 | `[phase22][R3][R4][R5][R6]` and `[phase23][R4][R6]` suites pass. |
| R8 | `npx vitest run test/watch/command.test.ts` | 0 | `[phase23][R8]` suite passes — but see F1: the passing assertions encode behavior that contradicts R8's text. |
| R18 | `npx vitest run test/sampler/asr.test.ts` | 0 | `[phase23][R18]` clamping and lower-limit-preservation cases pass. |
| R22 | `npx vitest run test/watch/asr-e2e.test.ts test/watch/context-efficiency.test.ts` | 0 | Compiled-registration, hermetic npm-cache, and corpus-efficiency cases pass. |
| R1, R2, R7, R9–R17, R19–R21 | — | — | **no-test-found**: no bracketed R#-tagged acceptance surface exists. Nearest untagged behavioral coverage is named per requirement in the adherence table above. |

## PRD Document Health

| Lens | Verdict | Evidence |
|------|---------|----------|
| Coherence | CONCERN | R13 is defined as the rejected out-of-scope approach (`.paul/PRD.md` Out of Scope), yet Success Criteria and Testing Strategy cite R13 as the owner of positive golden-clip and frame-budget evidence (`.paul/PRD.md` lines 25, 31, 107, 109). See F4. |
| Redundancy | HEALTHY | Success-criteria and testing-strategy references overlap by design — one states outcomes, the other names evidence surfaces. Stable IDs remain uniquely inventoried in a single requirements section. |
| Contradiction | CONCERN | R8's text says variable expansion and nested quoting are rejected while its own tagged acceptance surface asserts acceptance. See F1. |
| Readability | CONCERN | "Success Criteria (v0.1)" is interleaved with R16–R22 and M5-amended requirements with no marker separating historical from current acceptance scope. See F6. |

Additional operator-document contradiction (outside the PRD, recorded for routing): `docs/YOUTUBE-SETUP.md` line 73 lists "Whisper/local ASR" under **Unsupported**, while lines 121, 138, and 140 of the same document describe shipped, range-aware, captions-first local ASR. See F3.

## Findings and Routes

| Finding | Source | Route | Rationale | Action / provenance result |
|---------|--------|-------|-----------|----------------------------|
| F1 — R8 text claims variable expansion and nested quoting are rejected; parser accepts them verbatim without interpretation (escapes and concatenation are rejected) | Reviewer verdict R8 DRIFTED; parent-verified at `src/watch/command.ts` and `test/watch/command.test.ts:108` | `accept-reality` | The approved PLAN said these constructs are "unsupported; do not interpret them" and the Phase 23 PRD amendment mistranslated that as "rejected"; literal passthrough is the correct, safer semantics because rejecting `$` would break legitimate paths to prevent an error that already fails with a bounded typed diagnostic. | **Applied.** R8 amended in place in `.paul/PRD.md` to state that interior content is delegated verbatim and never interpreted, while empty refs, missing closing quotes, missing questions, escaped quotes, and token concatenation are rejected with the usage string. Provenance names Phase 23 / plan 23-01 and `.paul/audits/M5-AUDIT.md`. |
| F2 — Phase 20 "over-budget cues remain unchanged" claim has an exact-duplicate exception: the equality check in `src/sampler/captions.ts:96` precedes the 4,096-token budget check at lines 102–107, so an exact duplicate over budget is dropped | Reviewer F2; parent-verified by control-flow read of `withoutAdjacentOverlap` and its caller (`text === null` → `continue`) | `fix` | Current behavior is correct and must be preserved — reordering the checks would retain a duplicated 4,000+-token cue and defeat M5's context-efficiency purpose. Only the overstated claim and the missing test need repair. | **Recorded, not started.** Chain node **R3**. Actionable path: `/paul:fix` adding an exact-duplicate-over-budget test that pins current removal behavior, plus correcting the live STATE Accumulated Context wording to "exact duplicates of the immediately preceding overlapping cue are always removed; otherwise over-budget cues remain unchanged." **Constraint: do not reorder the equality and budget checks.** |
| F3 — `docs/YOUTUBE-SETUP.md` lists local ASR as unsupported while the same doc documents it as shipped | Reviewer F3; parent-verified at lines 73 vs 121/138/140 | `fix` | A stale v0.3-era line would otherwise ship inside the v0.5.0 tag contradicting a feature delivered in v0.4; the correction is one line and was executed before tagging rather than deferred. | **Recorded and executed.** Chain node **R22**. `docs/YOUTUBE-SETUP.md` unsupported-scope entry now reads that ASR is unsupported only as a *default* transcript source and links `LOCAL-ASR-SETUP.md`; 362 passed / 3 skipped after the edit. |
| F4 — Out-of-scope R13 is cited as positive acceptance traceability in PRD Success Criteria and Testing Strategy | Reviewer F4; parent-verified at `.paul/PRD.md` lines 25, 31, 107, 109 | `accept-reality` | R13 records a rejected approach and is satisfied by absence; leaving it cited as positive evidence would produce incorrect verdicts in future adherence audits. | **Applied.** R13 removed from the four positive-evidence citations in `.paul/PRD.md` Success Criteria and Testing Strategy, and a new out-of-scope traceability note for R13/R14/R15 was added stating they are satisfied by absence. Provenance names `.paul/audits/M5-AUDIT.md`. |
| F5 — 15 stable requirements (R1, R2, R7, R9–R17, R19–R21) have no R#-tagged acceptance surface | Reviewer F5; parent-verified by repository-wide tag grep | `defer` | Most of these have strong untagged behavioral coverage and the M4 audit already established `no-test-found` as an accepted record; tagging 15 requirements is an editorial project with low marginal value and real risk if rushed at milestone close. | **Deferred.** Recorded as a traceability gap; R1 and R10–R15 remain inherently uncertain. Candidate scope for a future milestone; no intent edit made. |
| F6 — PRD blends historical v0.1 success criteria with the current R16–R22 stable inventory without a separating marker | Reviewer F6; parent-verified at `.paul/PRD.md` lines 21 and 70 | `defer` | A PRD restructure is a larger editorial job that should not be attempted under milestone-close pressure on the project's most authoritative document. | **Deferred.** Recorded for future milestone planning; the F4 traceability note mitigates the most damaging consequence. No intent edit made. |

## Intent Re-affirmation

| R# | Still reflects author intent? | Evidence / requested change |
|----|-------------------------------|-----------------------------|
| R1 | Yes | Confirmed 2026-08-13. Reviewer flagged that no test proves every supported Pi run mode; the author was shown this explicitly and confirmed the requirement text unchanged. |
| R2 | Yes | Confirmed 2026-08-13 in the full R1–R22 re-affirmation. |
| R3 | Yes | Confirmed 2026-08-13. Related F2 claim repair is routed as `fix` without changing R3 intent. |
| R4 | Yes | Confirmed 2026-08-13. |
| R5 | Yes | Confirmed 2026-08-13. |
| R6 | Yes | Confirmed 2026-08-13. |
| R7 | Yes | Confirmed 2026-08-13. |
| R8 | Yes | Confirmed 2026-08-13 **against the F1-amended text**, which the author was asked to review specifically: interior content delegated verbatim and never interpreted; malformed input rejected with the usage string. |
| R9 | Yes | Confirmed 2026-08-13. |
| R10 | Yes | Confirmed 2026-08-13; remains explicitly deferred. |
| R11 | Yes | Confirmed 2026-08-13; remains explicitly deferred. |
| R12 | Yes | Confirmed 2026-08-13; remains explicitly deferred. |
| R13 | Yes | Confirmed 2026-08-13; remains out of scope and satisfied by absence per the F4 traceability note. |
| R14 | Yes | Confirmed 2026-08-13; remains out of scope. |
| R15 | Yes | Confirmed 2026-08-13; remains out of scope. |
| R16 | Yes | Confirmed 2026-08-13. |
| R17 | Yes | Confirmed 2026-08-13. |
| R18 | Yes | Confirmed 2026-08-13. |
| R19 | Yes | Confirmed 2026-08-13. |
| R20 | Yes | Confirmed 2026-08-13. |
| R21 | Yes | Confirmed 2026-08-13. |
| R22 | Yes | Confirmed 2026-08-13. |

Response mode: explicit "all confirmed" covering every stable ID R1–R22, given after the amended R8 text and the R1 evidence limitation were surfaced. No requirement change was requested, so no new finding was created.

## Completion

All six findings have a human-selected route, a one-line rationale, and a durable action / provenance result. Two `accept-reality` amendments (F1, F4) were applied in place to `.paul/PRD.md`; one `fix` (F3, chain R22) was recorded and executed before tagging; one `fix` (F2, chain R3) is recorded with a behavior-preserving constraint and not started; two findings (F5, F6) are deferred without intent edits. Full suite after all edits: 362 passed / 3 skipped.

Intent re-affirmation is complete: all 22 stable IDs R1–R22 received an explicit affirmative response on 2026-08-13, with no requested requirement change and therefore no new finding.

**Audit complete.** Every stable R# has one validated evidence-backed verdict (21 HELD, 1 DRIFTED resolved via F1 `accept-reality`, 0 OBSOLETE); every applicable trusted acceptance command has command/exit/result evidence or an explicit `no-test-found` record; all four PRD document-health lenses carry cited verdicts; all six findings carry a human route, rationale, and action/provenance result; and no fresh-context capability failure, unknown required evidence, missing route, failed route action, or missing re-affirmation remains. Returning `status: complete` to `complete-milestone.md`, which independently verifies this report before milestone mutation.
