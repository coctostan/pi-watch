# Milestones

Completed milestone log for this project.

| Milestone | Completed | Duration | Stats |
|-----------|-----------|----------|-------|
| M5 — v0.5 — Transcript First | 2026-08-13 | ~1.5 days elapsed | 4 phases, 4 plans, 28 key files |
| v0.4 — Listen Locally | 2026-08-11 | 2 days elapsed | 3 phases, 3 plans, 14 key files |
| v0.3 — Paste and Watch | 2026-08-09 | 30 days elapsed | 3 phases, 3 plans, 83 unique files |
| v0.2 — Tier 2, For Real | 2026-07-10 | 16 days elapsed | 4 phases, 4 plans, 10 unique files |

---

## ✅ M5 — v0.5 — Transcript First

**Version:** v0.5.0
**Completed:** 2026-08-13
**Duration:** ~1.5 days elapsed (phase work began 2026-08-11; milestone finalized 2026-08-13)
**Release tag:** `v0.5.0`
**Roadmap archive:** [archive/roadmap/v0.5.0-transcript-first.md](archive/roadmap/v0.5.0-transcript-first.md)
**Adherence audit:** [audits/M5-AUDIT.md](audits/M5-AUDIT.md)

### Stats

| Metric | Value |
|--------|-------|
| Phases | 4 (20–23) |
| Plans | 4 |
| Unique key product/test/doc files | 28 |
| Files changed since v0.4.0 | 101 outside `.paul/` (33 under `src/` and `test/`) |
| Parent final tests | 362 passed, 3 opt-in tests skipped by default |
| Final quality | Typecheck, build, byte-identical committed `dist/**`, and whitespace checks pass |
| Dependency audit | 0 critical / 4 high / 2 moderate in the unchanged dev tree |
| Adherence audit | 21 HELD / 1 DRIFTED (resolved) / 0 OBSOLETE across R1–R22; 6 findings routed |

### Key Accomplishments

- Normalized rolling captions conservatively — exact case-sensitive overlap of at least three tokens between temporally overlapping adjacent cues — measuring an exact 301→235 UTF-8 byte and 12→0 duplicate-token corpus reduction.
- Made all evidence range-aware behind one absolute half-open `[startMs, endMs)` range shared by captions, eligible ASR, and frames, with available-versus-returned coverage reported only after final output bounds.
- Moved transcript acquisition ahead of visual work so caption-backed broad, spoken, and mixed questions finish at tier 1 with a contract-valid zero-frame set and no scene detection or frame decoding.
- Closed the routed M4 follow-ups: quoted `/watch` local paths, ASR ceilings enforced at the exported adapter boundary, a hermetic test-owned npm cache for the package proof, and sampled-frame tier-2 terminology.
- Proved context efficiency through the manifest-declared compiled v0.5.0 registration: 1,374 / 1,394 / 1,077 tier-1 result bytes with zero `ffmpeg` calls against a same-corpus 7,144-byte visual control with 1 scene and 2 decode calls.
- Published `docs/TRANSCRIPT-FIRST.md` operator guidance and shipped v0.5.0 metadata with reproducible committed `dist/**`.
- Passed a fresh-context R11 adherence audit that caught and corrected an R8 requirement-wording drift introduced during Phase 23 UNIFY.

### Key Decisions

- Normalize only exact adjacent rolling-caption overlap under temporal overlap, a three-token minimum, and a 4,096-token prior-cue work ceiling; never fuzzy-match and never delete legitimate repetition.
- Apply one absolute half-open range everywhere; supported URL timestamps contribute start only as a conversion-safe singleton, explicit whole-second bounds win, and cue clipping preserves text and source.
- Route once after transcript staging on availability alone — no confidence scoring, no mutable state, no weakening of visual fallback; broad-only prompts stay ASR-ineligible.
- Clamp caller-supplied resource policies to compiled ceilings at the exported boundary, before any comparison or spawn.
- Prove package behavior through the first `package.json.pi.extensions` path with test-owned shims and a call ledger; report exact corpus-scoped values only, never general latency or quality claims.
- Keep `/watch` deliberately not a shell: interior quoted content is delegated verbatim and never interpreted, while malformed input is rejected with the usage string.

### Source Summaries

- [Phase 20 — Normalize and measure](phases/20-normalize-and-measure/20-01-SUMMARY.md)
- [Phase 21 — Range-aware evidence](phases/21-range-aware-evidence/21-01-SUMMARY.md)
- [Phase 22 — Route before decoding](phases/22-route-before-decoding/22-01-SUMMARY.md)
- [Phase 23 — Harden and prove](phases/23-harden-and-prove/23-01-SUMMARY.md)

---
## ✅ v0.4 — Listen Locally

**Version:** v0.4.0
**Completed:** 2026-08-11
**Duration:** 2 days elapsed (phase work began 2026-08-09; milestone finalized 2026-08-11)
**Release tag:** `v0.4.0`
**Roadmap archive:** [archive/roadmap/v0.4.0-listen-locally.md](archive/roadmap/v0.4.0-listen-locally.md)
**Adherence audit:** [audits/M4-AUDIT.md](audits/M4-AUDIT.md)

### Stats

| Metric | Value |
|--------|-------|
| Phases | 3 (17–19) |
| Plans | 3 |
| Unique key product/test/doc/research files | 14 |
| Parent final tests | 248 passed, 3 opt-in tests skipped by default |
| Final quality | Parent typecheck, build, and diff checks pass; isolated ambient npm-cache failure is routed as F8/R22 |
| Dependency audit | 0 critical / 4 high / 2 moderate in the unchanged dev tree |

### Key Accomplishments

- Established the observed `mlx_whisper` executable/JSON contract and measured a bounded Apple Silicon baseline.
- Shipped explicitly enabled captions-first local English ASR with timestamped tier-1 transcript segments.
- Added duration/timeout/output policy, typed privacy-safe diagnostics, narrow output ownership, and visual fallback across every failure path.
- Proved the manifest-declared compiled package through deterministic missing-executable execution without hidden model or network setup.
- Added bounded synthetic speech evidence, an exact-opt-in live-model proof, and complete operator setup/remediation guidance.
- Finished with a parent result of 248 passing tests / 3 default-skipped opt-in tests and passing typecheck/build gates; isolated review's ambient npm-cache failure remains explicit routed follow-up F8/R22.

### Key Decisions

- Gate explicitly enabled local ASR at the extension for spoken intent only; preserve captions first and visual fallback on every failure.
- Invoke the configured direct `mlx_whisper` executable; keep package/model installation, caches, and lifecycle user-managed.
- Own only adapter-created output and expose only typed diagnostics without refs, transcript text, stderr, credentials, or cache paths.
- Keep default acceptance deterministic through the compiled registration boundary; real-model proof remains exact-opt-in and finite.
- Reconcile product intent through the mandatory R1–R22 adherence audit without representing F1–F17 routed fixes as already complete.

### Source Summaries

- [Phase 17 — Bounded ASR foundation](phases/17-bounded-asr-foundation/17-01-SUMMARY.md)
- [Phase 18 — Local transcript fallback](phases/18-local-transcript-fallback/18-01-SUMMARY.md)
- [Phase 19 — Local speech UX and proof](phases/19-local-speech-ux-and-proof/19-01-SUMMARY.md)

---

## ✅ v0.3 — Paste and Watch

**Version:** v0.3.0
**Completed:** 2026-08-09
**Duration:** 30 days elapsed (phase work began 2026-07-10; milestone finalized 2026-08-09)
**Release tag:** `v0.3.0`
**Roadmap archive:** [archive/roadmap/v0.3.0-paste-and-watch.md](archive/roadmap/v0.3.0-paste-and-watch.md)

### Stats

| Metric | Value |
|--------|-------|
| Phases | 3 (14–16) |
| Plans | 3 |
| Unique product/test/doc/generated files | 83 |
| Final tests | 194 passed, 2 opt-in live tests skipped by default |
| Final quality | Typecheck and build pass; mandatory public-YouTube smoke passed |
| Dependency audit | 0 critical / 4 high / 2 moderate in the unchanged dev tree |

### Key Accomplishments

- Added secure YouTube watch, short-link, and shorts resolution into sampler-owned local media while preserving caller refs and local-file behavior.
- Made transcript-first routing real through bounded human-caption acquisition with one automatic-caption fallback and pure WebVTT parsing.
- Preserved deterministic visual fallback across missing captions and operational failures without fabricating spoken content.
- Proved pasted URLs through the actual registered `watch` tool and `/watch` command boundaries, including a bounded opt-in live YouTube smoke.
- Shipped Pi-loadable compiled output plus complete Git/local installation, supported-scope, fallback, cleanup, and troubleshooting documentation.
- Finished with 194 passing tests, 2 default-skipped live tests, and passing typecheck/build gates.

### Key Decisions

- Preserve separate caller `originalRef` and local `mediaRef`; only resolver-created storage is sampler-owned and removable.
- Keep all `yt-dlp` execution argv-only, timeout/output-bounded, and isolated from user configuration with `--ignore-config`.
- Prefer human captions, then make at most one automatic-caption fallback; every caption failure degrades to transcript source `none`.
- Bound caption data before shared-timeline assembly with a 16 MiB pre-read cap and duration-aware cue filtering.
- Commit exact `npm run build` output under `dist/**` because Pi Git installs omit dev-only build tooling; add no prepare hook or dependency.
- Use verified Git/local Pi package sources and reject the unrelated unscoped `npm:pi-watch` registry package.

### Source Summaries

- [Phase 14 — YouTube source resolution](phases/14-youtube-source-resolution/14-01-SUMMARY.md)
- [Phase 15 — Caption transcript pipeline](phases/15-caption-transcript-pipeline/15-01-SUMMARY.md)
- [Phase 16 — End-to-end URL UX](phases/16-end-to-end-url-ux/16-01-SUMMARY.md)

---

## ✅ v0.2 — Tier 2, For Real

**Version:** v0.2.0
**Completed:** 2026-07-10
**Duration:** 16 days elapsed (phase work began 2026-06-24; milestone finalized 2026-07-10)
**Release tag:** `v0.2.0`
**Roadmap archive:** [archive/roadmap/v0.2.0-tier-2-for-real.md](archive/roadmap/v0.2.0-tier-2-for-real.md)

### Stats

| Metric | Value |
|--------|-------|
| Phases | 4 (10–13) |
| Plans | 4 |
| Unique product/test/doc files | 10 |
| Final tests | 152 passed, 1 opt-in live test skipped |
| Final quality | Build, typecheck, and npm audit clean |

### Key Accomplishments

- Stood up `mlx_vlm.server` with `mlx-community/Qwen3-VL-8B-Instruct-4bit` through a uv-pinned Python 3.12 environment and documented the reproducible local setup.
- Proved the production `buildTier2Request` → local OpenAI-compatible endpoint → `parseTier2Answer` wire shape against a real Qwen3-VL response without adding a model-specific adapter branch.
- Added an opt-in, default-skipped `WATCH_TIER2_LIVE=1` integration proof so offline/default test runs remain deterministic.
- Replaced silent tier-2 failures with a structured, secret-free `Tier2Diagnostic` covering unconfigured, HTTP, empty-answer, timeout, and network failures.
- Surfaced `details.tier2` on `watch` and per-item `watch_batch` results while preserving the load-bearing `null === escalate` tier-walk contract.
- Added an actionable, secret-free unconfigured hint to single-video `watch` results only when another tier answers.
- Added opt-in `WATCH_TIER2_LOCAL=1` localhost resolution with explicit URL/model precedence and an unchanged network-free default path.

### Key Decisions

- Start with `mlx-community/Qwen3-VL-8B-Instruct-4bit` as the smallest verified local green path; keep the model swappable through `baseURL` + model id.
- Keep live model verification opt-in and use the production adapter path rather than a model-specific request branch.
- Surface diagnostics through an optional `onDiagnostic` boundary collector instead of widening `TierRunner` or changing `null === escalate`.
- Record `details.tier2` only when tier 2 did not answer; successful tier-2 results carry no failure diagnostic.
- Ship config UX option-b: secret-free guidance plus explicit opt-in `WATCH_TIER2_LOCAL=1`; explicit configuration wins and the no-flag default stays network-free.
- Keep aggregate `watch_batch` content unchanged; structured per-item diagnostics remain the batch failure surface.

### Source Summaries

- [Phase 10 — Stand up the model](phases/10-standup-model/10-01-SUMMARY.md)
- [Phase 11 — Tier-2 live wire-shape proof](phases/11-tier2-live-proof/11-01-SUMMARY.md)
- [Phase 12 — Tier-2 failure diagnostics](phases/12-tier2-failure-diagnostics/12-01-SUMMARY.md)
- [Phase 13 — Tier-2 config UX](phases/13-tier2-config-ux/13-01-SUMMARY.md)

---
