---
milestone: M4
trigger: milestone-close
status: complete
date: 2026-08-11T07:56:13-04:00
reviewer: codex-adversarial-review (isolated, read-only; parent-validated)
---

# M4 Adherence Audit

## Requirement Adherence

| R# | Verdict | Evidence | Tagged acceptance evidence |
|----|---------|----------|----------------------------|
| R1 | HELD | Amended R1 matches the activation spike and production registration: `watch` registers and executes across supported Pi run modes, while external active-tool governors require explicit allowlisting/enablement guidance. | No R1-tagged PLAN, SUMMARY, or test evidence found; behavioral registration coverage is untagged. |
| R2 | HELD | `src/contract/watched-frame-set.ts:67-170` defines ordered frames, timestamps, resolution/origin, transcript segments, source metadata, and pure cross-field validation. | No R2-tagged evidence found; contract tests are untagged. |
| R3 | DRIFTED | Scene selection/budget exist, but `src/watch/extension.ts:247-270` samples with call/config resolution before OCR routing derives `high`; approved F2 remains routed to R3 fix work. | No R3-tagged evidence and no registered OCR-question-to-decoder-resolution test found. |
| R4 | HELD | Amended deterministic policy matches `src/router/route.ts:133-163` and `src/watch/tier-runner.ts:375-388`: any non-empty transcript uses tier 1 and absence escalates. | No R4-tagged evidence found; behavior tests are untagged. |
| R5 | HELD | `src/sampler/effects.ts:211-264,311-350` implements local refs plus the amended bounded YouTube forms and explicit ownership/cleanup. | No R5-tagged evidence found; source-resolution tests are untagged. |
| R6 | HELD | `src/watch/tier-runner.ts:360-402` implements tiers 1/3 and `src/watch/tier2.ts:39-85` sends sampled OpenAI-compatible image blocks for tier 2. | No R6-tagged evidence found; tier adapter tests are untagged. |
| R7 | HELD | `src/config/config.ts:60-70,99-182` implements the amended endpoint/model, budget, resolution, fetch-timeout, and local-ASR controls with fixed tier/source policy. | No R7-tagged evidence found; config tests are untagged. |
| R8 | DRIFTED | `/watch` registers and delegates, but `src/watch/command.ts:46-73` cannot represent whitespace-containing local refs; approved F9 remains routed to R8 fix work. | No R8-tagged evidence found; command tests are untagged. |
| R9 | HELD | Amended R9 matches `src/watch/batch.ts:152-194`: items run concurrently through `Promise.allSettled`, preserve order, isolate failures, and produce bounded text. | No R9-tagged evidence found; batching tests are untagged. |
| R10 | HELD | `src/watch/batch.ts:127-136` preserves tier-3 fan-out deferral and returns single-video follow-up guidance. | No R10-tagged evidence found; deferral coverage is untagged. |
| R11 | HELD | Gemini remains optional/deferred and `src/watch/tier2.ts:28-37` keeps providers generic through endpoint/model/key configuration. | No R11-tagged evidence or dedicated Gemini acceptance test found. |
| R12 | HELD | `src/watch/tier2.ts:39-85` sends sampled frames rather than native-video ingestion, preserving the amended explicit deferral. | No R12-tagged evidence or native-video test found. |
| R13 | HELD | `src/sampler/select-frames.ts:48-114` selects scene cuts/backfill under an absolute budget rather than sampling every frame. | No R13-tagged evidence found; frame-cap tests are untagged. |
| R14 | HELD | `src/watch/tier2.ts:163-190` keeps tier 2 network-free when unconfigured and `src/watch/tier-runner.ts:360-368` preserves offline tier 3. | No R14-tagged evidence found; cloud-independence/fallback tests are untagged. |
| R15 | HELD | Production uses generic sampled-frame OpenAI-compatible delivery and contains no Ollama/native-video implementation. | No R15-tagged or Ollama-specific test found. |
| R16 | HELD | `src/watch/extension.ts:247-270` gates ASR policy on explicit config plus spoken intent, and `src/sampler/sample.ts:108-127` runs ASR only after a caption miss. | No R16-tagged evidence found; Phase 18/19 AC coverage is untagged by R#. |
| R17 | HELD | `src/sampler/asr.ts:169-203` invokes the configured executable directly with English transcription/JSON argv and validates timestamped segments. | No R17-tagged evidence found; ASR adapter tests are untagged by R#. |
| R18 | DRIFTED | Config clamps duration/timeout, but exported `fetchLocalAsrTranscript` trusts direct caller `policy.maxDurationMs` and `policy.timeoutMs` at `src/sampler/asr.ts:142-188`, bypassing the claimed compiled ceilings. | No R18-tagged evidence or direct oversized-policy ceiling test found. |
| R19 | HELD | `src/sampler/asr.ts:29-39,121-138` defines closed typed diagnostics and `src/watch/extension.ts:280-323` composes privacy-safe details. | No R19-tagged evidence found; privacy tests are untagged by R#. |
| R20 | HELD | `src/sampler/asr.ts:158-164,210-216` creates and removes only its own temporary output directory. | No R20-tagged evidence found; ownership tests are untagged by R#. |
| R21 | HELD | Amended R21 matches `src/sampler/sample.ts:108-127`: caption transcripts remain intact, while ASR failure returns no ASR transcript and preserves visual fallback. | No R21-tagged evidence found; fallback tests are untagged by R#. |
| R22 | DRIFTED | Documentation and compiled-registration/live proofs exist, but `test/watch/asr-e2e.test.ts:355-359` uses the ambient npm cache; approved F8 remains routed to R22 fix work. | No R22-tagged evidence found; Phase 19 uses AC tags rather than R22. |

## Tagged Acceptance Evidence

Repository searches found no behavioral R1–R22 tags in Phase 17–19 PLAN/SUMMARY artifacts or `test/**/*.ts`. Untagged code/tests support the verdicts above; the explicit rows below are the required no-test-found records rather than inferred tagged acceptance evidence.

| R# | Command | Exit | Result / no-test-found evidence |
|----|---------|------|---------------------------------|
| R1 | — | — | No R1-tagged acceptance command/test found. |
| R2 | — | — | No R2-tagged acceptance command/test found. |
| R3 | — | — | No R3-tagged acceptance command/test found; OCR resolution drift remains routed through F2. |
| R4 | — | — | No R4-tagged acceptance command/test found. |
| R5 | — | — | No R5-tagged acceptance command/test found. |
| R6 | — | — | No R6-tagged acceptance command/test found. |
| R7 | — | — | No R7-tagged acceptance command/test found. |
| R8 | — | — | No R8-tagged acceptance command/test found; whitespace-ref drift remains routed through F9. |
| R9 | — | — | No R9-tagged acceptance command/test found; untagged batching tests support the amended requirement. |
| R10 | — | — | No R10-tagged acceptance command/test found. |
| R11 | — | — | No R11-tagged acceptance command/test found. |
| R12 | — | — | No R12-tagged acceptance command/test found. |
| R13 | — | — | No R13-tagged acceptance command/test found. |
| R14 | — | — | No R14-tagged acceptance command/test found. |
| R15 | — | — | No R15-tagged acceptance command/test found. |
| R16 | — | — | No R16-tagged acceptance command/test found; Phase 18/19 AC evidence is untagged. |
| R17 | — | — | No R17-tagged acceptance command/test found; Phase 18 AC evidence is untagged. |
| R18 | — | — | No R18-tagged acceptance command/test found; direct oversized-policy ceilings are untested. |
| R19 | — | — | No R19-tagged acceptance command/test found; privacy coverage is untagged. |
| R20 | — | — | No R20-tagged acceptance command/test found; ownership coverage is untagged. |
| R21 | — | — | No R21-tagged acceptance command/test found; untagged caption/fallback tests support the amended requirement. |
| R22 | — | — | No R22-tagged acceptance command/test found; Phase 19 AC evidence is untagged and F8 is routed. |

### Trusted Command Execution Record

| Runner | Command | Exit | Result |
|--------|---------|------|--------|
| Isolated reviewer | `npm test` | 1 | 247 passed / 3 skipped / 1 failed: Phase 19 AC-4 nested `npm pack` hit a root-owned global npm cache (`EPERM`). |
| Isolated reviewer | `npm run typecheck` | 0 | Passed. |
| Isolated reviewer | `npm run build` | 0 | Passed. |
| Parent validation | `npm test` | 0 | 248 passed / 3 skipped. |
| Parent validation | `npm run typecheck` | 0 | Passed. |
| Parent validation | `npm run build` | 0 | Passed. |
| Parent final validation after routes/re-affirmation | `npm test` | 0 | 248 passed / 3 skipped. |
| Parent final validation after routes/re-affirmation | `npm run typecheck` | 0 | Passed. |
| Parent final validation after routes/re-affirmation | `npm run build` | 0 | Passed. |
| Parent final validation after routes/re-affirmation | `git diff --check` | 0 | Passed. |
| Parent final validation after F16/F17 and R1 re-affirmation | `npm test` | 0 | 248 passed / 3 skipped. |
| Parent final validation after F16/F17 and R1 re-affirmation | `npm run typecheck` | 0 | Passed. |
| Parent final validation after F16/F17 and R1 re-affirmation | `npm run build` | 0 | Passed. |
| Parent final validation after F16/F17 and R1 re-affirmation | `git diff --check` | 0 | Passed. |

The differing exact `npm test` outcomes validate an environment-dependent npm-cache finding; the current parent gate passes, but the nested package proof is not hermetic.

## PRD Document Health

| Lens | Verdict | Evidence |
|------|---------|----------|
| Coherence | HELD | PRD now distinguishes shipped v0.4 state, validated foundations, current risks, delivered historical direction, and future research; M4 requirements are stable R16–R22. |
| Redundancy | HELD | Success Criteria define outcomes while Testing Strategy names methods and concrete repository evidence; their R# overlap is purposeful traceability rather than unsupported repetition. |
| Contradiction | CONCERN | The overbroad R1 governor clause was reconciled through F16. The tier-1 cost criterion intentionally remains unmet implementation intent and is durably routed through F17/R3 rather than represented as current behavior. |
| Readability | HELD | Current requirements, shipped M4 additions, deferred/out-of-scope boundaries, operating assumptions, risks, and historical direction are separated; remaining repository terminology/comment cleanup is routed through F14/F15. |

## Findings and Routes

| Finding | Source | Route | Rationale | Action / provenance result |
|---------|--------|-------|-----------|----------------------------|
| F1 — M4-specific ASR outcomes have no stable R# representation; success/testing prose repeats without traceability. | PRD Requirements/Success Criteria/Testing Strategy; ROADMAP M4 goal | accept-reality | Add stable post-R15 requirements for the shipped M4 local-ASR contract so the PRD represents the current product. | Human-approved 2026-08-11. Added R16–R22 without renumbering R1–R15, added R# traceability to Success Criteria and Testing Strategy, and recorded this audit as provenance in `.paul/PRD.md`. |
| F2 — R3/README promise question-driven high-resolution OCR sampling, but sampling occurs before routing and uses only call/config resolution. | PRD R3; `src/watch/extension.ts:247-270`; `README.md:109` | fix | Preserve question-driven high-resolution OCR intent and correct the sampling-before-routing composition gap. | Human-approved 2026-08-11. Routed to chain node R3 for actionable future `/paul:fix`; no implementation or README claim is marked fixed by this audit. |
| F3 — R4 promises escalation for an inadequate transcript, but any non-empty transcript terminates tier 1. | PRD R4; `src/watch/tier-runner.ts:375-428` | accept-reality | Define deterministic escalation on transcript absence; semantic inadequacy has no reliable signal in the current architecture. | Human-approved 2026-08-11. Amended exact PRD R4 in place to make non-empty transcript handling and the absence of confidence scoring explicit, with M4 audit provenance. |
| F4 — R5 says local path or URL via yt-dlp, while production supports only narrow YouTube URLs. | PRD R5; `src/sampler/effects.ts:220-264`; `test/sampler/effects.test.ts:247-259` | accept-reality | Document the deliberately bounded surface of local paths and supported YouTube URL forms. | Human-approved 2026-08-11. Amended exact PRD R5 in place to name local paths and supported YouTube watch/short-link/shorts URLs, with M4 audit provenance. |
| F5 — R7 requires tier order/enablement, resolution thresholds, and transcript-source selection that the config surface omits. | PRD R7; `src/config/config.ts:20-21,60-70` | accept-reality | Align R7 with the validated config surface and retain fixed tier/source policy rather than promising unused controls. | Human-approved 2026-08-11. Amended exact PRD R7 in place to name implemented controls and fixed tier/transcript-source policy, with M4 audit provenance. |
| F6 — PRD Current State is stale and contradicts the completed project. | `.paul/PRD.md:9-13`; `.paul/ROADMAP.md:7-45` | accept-reality | Replace the obsolete pre-production Current State with the shipped v0.4 system state. | Human-approved 2026-08-11. Replaced the exact PRD Current State section and linked this audit as provenance. |
| F7 — “native video” terminology is ambiguous between R6, R12, and sampled-frame implementation. | PRD R6/R12; `src/watch/tier2.ts:39-85` | accept-reality | Use sampled-frame vision terminology and reserve native video for the explicitly deferred path. | Human-approved 2026-08-11. Amended exact PRD R6 and R12 wording in place, with M4 audit provenance. |
| F8 — Phase 19 AC-4's nested `npm pack` uses the global npm cache, producing reviewer `EPERM` while the parent run passes. | `test/watch/asr-e2e.test.ts:355-359`; trusted command records above | fix | Make nested package verification hermetic by using a test-owned temporary npm cache. | Human-approved 2026-08-11. Routed to chain node R22 for actionable future `/paul:fix`; the passing parent run does not mark the hermeticity defect fixed. |
| F9 — `/watch` treats the first whitespace-delimited token as the ref, so local paths containing spaces cannot be represented. | `src/watch/command.ts:46-73` | fix | Support quoted local refs so ordinary macOS paths containing spaces work through `/watch`. | Human-approved 2026-08-11. Routed to chain node R8 for actionable future `/paul:fix`, including parser tests and documentation; no implementation is marked fixed by this audit. |
| F10 — R9 literally requires batching through `Promise.all`, while production intentionally uses failure-isolating `Promise.allSettled`. | PRD R9; `src/watch/batch.ts:152-194` | accept-reality | Specify concurrent ordered failure-isolated batching; `Promise.allSettled` is the intentional implementation. | Human-approved 2026-08-11. Amended exact PRD R9 in place to specify behavior and name the current combinator, with M4 audit provenance. |
| F11 — R18 promises compiled ASR duration/timeout ceilings, but the exported direct adapter trusts oversized caller policy values outside config normalization. | PRD R18; `src/sampler/asr.ts:142-188`; `src/config/config.ts:99-114` | fix | Enforce absolute ASR duration and timeout ceilings inside the exported adapter and test oversized direct policies. | Human-approved 2026-08-11. Routed to chain node R18 for actionable future `/paul:fix`; config clamping does not mark the exported-boundary defect fixed. |
| F12 — R21 says ASR ineligibility yields no transcript, but caption availability makes ASR ineligible while correctly retaining a caption transcript. | PRD R21; `src/sampler/sample.ts:108-127`; `docs/LOCAL-ASR-SETUP.md:65` | accept-reality | Clarify that ASR failure yields no ASR transcript while caption-based ineligibility retains valid captions. | Human-approved 2026-08-11. Amended exact PRD R21 in place to distinguish ASR output from retained caption transcripts, with M4 audit provenance. |
| F13 — PRD still mixes verified v0.4 reality with pre-build Why Now, unresolved activation assumptions/risks, and the original recommended build sequence; acceptance strategy remains unlinked to repository surfaces. | `.paul/PRD.md:6-7,92-128` | accept-reality | Reconcile remaining historical PRD sections with verified v0.4 reality and link existing acceptance surfaces. | Human-approved 2026-08-11. Reconciled Why Now, Desired Outcome, R1, foundations, open questions, Testing Strategy evidence links, current risks, and delivered direction in exact PRD sections with M4 audit provenance. |
| F14 — Surrounding roadmap and user-facing descriptions still use ambiguous “native video” terminology after R6/R12 were clarified to distinguish sampled-frame tier 2 from native-video ingestion. | `.paul/ROADMAP.md:5`; `src/watch/extension.ts:146-151`; `src/watch/tier-runner.ts:390-397` | fix | Use sampled-frame vision terminology in user-facing descriptions/comments and reserve native video for deferred ingestion. | Human-approved 2026-08-11. Routed to chain node R6 for actionable future `/paul:fix`; PRD wording is corrected but repository-wide terminology is not marked fixed. |
| F15 — Router comments and returned rationale still promise escalation when a non-empty transcript is “insufficient,” although amended R4 excludes adequacy scoring and tier 1 terminates on any non-empty transcript. | `src/router/route.ts:121-158`; `src/watch/tier-runner.ts:370-388` | fix | Align router comments and rationale with deterministic transcript-presence behavior without changing runtime policy. | Human-approved 2026-08-11. Routed to chain node R4 for actionable future `/paul:fix`; no runtime behavior is marked changed by this audit. |
| F16 — Amended R1 requires external active-tool governors not to silently strip `watch`, but the activation spike proves an external governor may strip it unless configured. | PRD R1; `spikes/01-tool-activation/FINDINGS.md`; `src/watch/extension.ts:209-245` | accept-reality | Require verified registration/execution and documented governor allowlisting rather than control over external governors. | Human-approved 2026-08-11. Amended exact PRD R1 in place to distinguish supported Pi activation from external governor configuration, with M4 audit provenance. |
| F17 — Tier-1 cost criteria claim no frame sampling when a transcript suffices, but `sample()` performs scene detection/frame decoding before captions/ASR acquisition and routing. | PRD Success Criteria R4/R6; `src/sampler/sample.ts:85-143`; `src/watch/extension.ts:247-270` | fix | Preserve transcript-first cost behavior and route frame-decoding avoidance through future R3 implementation work. | Human-approved 2026-08-11. Routed to chain node R3 for actionable future PLAN/fix work that acquires sufficient transcript evidence before scene detection/frame decode; current sampling order is not marked fixed. |

## Intent Re-affirmation

The author explicitly re-affirmed the F16-reconciled R1 wording on 2026-08-11; all R1–R22 intent confirmations are durable after F1–F17 routing and action results.

| R# | Still reflects author intent? | Evidence / requested change |
|----|-------------------------------|-----------------------------|
| R1 | Yes | Author explicitly confirmed the F16-reconciled requirement: verified Pi registration/execution plus documented allowlisting when an external governor controls the active set. |
| R2 | Yes | Author confirmed the tier-neutral timeline contract; no change requested. |
| R3 | Yes | Author retained question-driven high-resolution OCR intent; implementation drift remains routed through F2/R3. |
| R4 | Yes | Author confirmed deterministic transcript-presence routing without semantic confidence scoring; comment cleanup remains routed through F15/R4. |
| R5 | Yes | Author confirmed local paths plus bounded supported YouTube forms; no change requested. |
| R6 | Yes | Author confirmed transcript/sampled-frame/frames adapter intent; repository terminology cleanup remains routed through F14/R6. |
| R7 | Yes | Author confirmed the implemented config surface and fixed tier/source policy; no change requested. |
| R8 | Yes | Author retained the `/watch` wrapper intent; whitespace-path drift remains routed through F9/R8. |
| R9 | Yes | Author confirmed concurrent ordered failure-isolating batching; no change requested. |
| R10 | Yes | Author confirmed tier-3 batch fan-out remains deferred. |
| R11 | Yes | Author confirmed Gemini remains optional. |
| R12 | Yes | Author confirmed native-video ingestion remains deferred. |
| R13 | Yes | Author confirmed always-sample-every-frame remains out of scope. |
| R14 | Yes | Author confirmed mandatory cloud remains out of scope. |
| R15 | Yes | Author confirmed Ollama native-video support remains out of scope. |
| R16 | Yes | Author confirmed explicit spoken-intent/caption-miss ASR eligibility; no change requested. |
| R17 | Yes | Author confirmed the thin direct `mlx_whisper` adapter boundary; no change requested. |
| R18 | Yes | Author retained absolute ASR bounds; exported-boundary drift remains routed through F11/R18. |
| R19 | Yes | Author confirmed typed privacy-safe diagnostics; no change requested. |
| R20 | Yes | Author confirmed adapter-only output ownership and cleanup; no change requested. |
| R21 | Yes | Author confirmed caption retention plus failure-to-visual fallback; no change requested. |
| R22 | Yes | Author retained deterministic compiled proof and optional live proof; npm-cache hermeticity remains routed through F8/R22. |

## Completion

Complete: the canonical M4 audit contains one validated verdict and explicit tagged-evidence/no-test-found record for every stable R1–R22, all four cited PRD document-health lenses, human-approved routes/rationales/action results for F1–F17, and explicit author intent confirmation for R1–R22 after final reconciliation. Fresh isolated review and final closure review were parent-validated; final parent verification passed with 248 tests / 3 skipped, typecheck, build, and `git diff --check`. Routed fix findings remain durable follow-up work and are not represented as already fixed.
