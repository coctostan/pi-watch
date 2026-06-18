# pi-watch

## PALS Workflow

This project uses [PALS](https://github.com/coctostan/pals) — a project automation & lifecycle system.

- **Lifecycle:** PLAN → APPLY → UNIFY loop
- **State:** `.paul/STATE.md` tracks current position
- **Commands:** `/paul:plan`, `/paul:apply`, `/paul:unify`, `/paul:fix`
- **Git workflow:** none (not a git repo yet — run `git init` and update `pals.json` to enable)
- **Active modules:** carl, codi, todd, walt, dean, iris, skip, dave, ruby, arch, seth, pete, gabe, luke, aria, dana, omar, reed, vera, docs, rev

## Boundaries

### Always Do
- Run tests before marking work complete
- Follow the PLAN → APPLY → UNIFY loop
- Check `.paul/STATE.md` for current project position before starting work

### Ask First
- Before modifying files outside the current plan scope
- Before adding new dependencies
- Before changing architecture patterns

### Never Do
- Commit secrets, API keys, or credentials
- Skip the UNIFY phase after APPLY
- Modify `.paul/` files directly — use `/paul:*` commands

## Engineering Principles

<!-- Default guidance for AI agents. Project-specific conventions below remain authoritative. -->

- Functional-first, not functional-only: use functional patterns where they make code clearer, but keep local idioms and framework conventions.
- Prefer boring, readable, testable code over clever abstractions.
- Project Conventions remain authoritative; follow existing project style before introducing new patterns.
- Prefer pure functions for business logic, data transformation, validation, and decision-making.
- Keep side effects explicit and near boundaries: I/O, database, network, filesystem, logging, time, randomness, and process/env access.
- Prefer immutable data and explicit state/dependency passing where practical.
- Keep changes minimal and local; avoid unapproved dependencies or architecture changes.

## Project Conventions

<!-- Add project-specific conventions that AI agents should follow. -->
<!-- Examples: naming patterns, import style, architecture decisions, domain terms. -->
<!-- This section is yours — PALS won't overwrite it during regeneration. -->

- **Source of truth:** `DESIGN.md` is the design seed. Don't relitigate decisions marked VERIFIED or "Decided / rejected" without a concrete reason.
- **Sampler ownership:** We own the sampling. Model backends are thin, swappable OpenAI-compatible adapters (`baseURL` + `model id`) — never fork code per model.
- **Tier discipline:** Pick the cheapest tier that answers the question (1: transcript, 2: native video model, 3: frames-into-context). Tier 3 is the universal fallback.
- **Local-first:** Cloud (e.g. Gemini) is always optional, never a required dependency.
