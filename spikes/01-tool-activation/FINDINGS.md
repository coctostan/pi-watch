# Phase 01 — Tool-Activation Spike: FINDINGS

**Verdict: custom-tool activation WORKS in pi 0.79.6 across all run modes and load
methods.** The spike-#1 "tool not found" symptom was caused by an unrelated
**third-party tool-governor extension (`pi-loadout`)** stripping the tool from the
active set at startup — not by the `-e` flag, print mode, trust, or our code.

End-to-end proof: `pi --no-extensions -e ./spikes/01-tool-activation/watch-probe.ts -p "Call the watch_probe tool with message hello"` →
the model invoked the tool and returned **`WATCH_PROBE_OK:hello`**.

---

## Verdict table

Ground truth = "did the LLM actually call the tool and return the sentinel?"
(model-free reports characterize registration/active-set; the human/CLI e2e runs
characterize executability.)

| Load method | Run mode | In `getAllTools()` | In active set | LLM can call it | Verdict |
|---|---|---|---|---|---|
| `-e` flag | tui | ✅ | ✅ | ✅ (clean env) | **WORKS** |
| `-e` flag | print (`-p`) | ✅ | ✅ | ✅ (clean env) | **WORKS** |
| `-e` flag | json (`--mode json`) | ✅ | ✅ | ✅ (clean env) | **WORKS** |
| project auto-discovery (`.pi/extensions/`) | print | ✅ | ✅ | ✅ (clean env) | **WORKS** (project is trusted) |

"Clean env" = `--no-extensions` (global package extensions disabled). With the
default global loadout active, **every** combination above reports `WORKS` for
registration but the LLM **cannot call the tool** — see root cause.

---

## Root cause of the spike-#1 gotcha

The failure is **environmental**, not code or mode:

1. `pi.registerTool()` at the top of the extension factory always succeeds. The
   tool appears in `pi.getAllTools()` in every mode and load method.
2. The default global setup (`~/.pi/agent/settings.json` → `packages`) includes
   **`pi-loadout`** (`npm:pi-loadout`). On `session_start`, loadout restores a
   saved set of enabled tools and calls
   `pi.setActiveTools([...enabledTools])`
   (`pi-loadout/extensions/index.ts` lines 623 / 636).
3. That allowlist is built from previously-known tools. A freshly-registered
   `watch_probe` is **not** in it, so loadout's handler — running *after* our
   `session_start` — **removes `watch_probe` from the active (model-facing) set.**
4. Result: the tool is registered and introspectable but never reaches the tool
   schema sent to the model. The LLM reports "no such tool" in **every** mode.

Controls that pin the cause (all in print mode, all FAIL with the default env):
- our `watch_probe` via `-e` — FAIL
- our `watch_probe` via `-e` **+ `-t watch_probe` allowlist** — FAIL (loadout overrides)
- template `myext_echo` (known-good starter) via `-e` — FAIL
- template `myext_echo` via project auto-discovery — FAIL
- official `examples/extensions/dynamic-tools.ts` (`echo_session`) via `-e` — FAIL

The one change that fixes all of them: **`--no-extensions`** (disables global
package extensions incl. loadout) → tool executes and returns the sentinel.

### Secondary finding (probe bug, now fixed)
Our first probe measured the active set with
`pi.getActiveTools().map(t => t.name)`. **`pi.getActiveTools()` returns
`string[]` (tool NAMES), not objects**, so `.name` was always `undefined`,
making `inActive` falsely `false` and `activeToolNames` `[null]` in every report.
This produced a misleading early diagnosis. Corrected probe uses the names
directly. Confirmed API shapes in 0.79.6:
- `pi.getAllTools()` → `Array<{ name, description, parameters, promptGuidelines, sourceInfo }>`
- `pi.getActiveTools()` → `Array<string>` (names)
- `pi.setActiveTools(names: string[])` → sets the active set by name

With the corrected probe in a clean env, `inActive` is **`true` before and after**
`setActiveTools` in print and json — i.e. **`setActiveTools` is not required** for
a registered tool to be active.

---

## THE RECIPE for Phase 5 (real `watch` tool)

1. **Registration**: register `watch` synchronously at the top of the extension
   factory with `pi.registerTool({ name, label, description, promptSnippet,
   promptGuidelines, parameters, execute })`. **`promptSnippet` is mandatory** —
   without it the tool is omitted from the `Available tools` prompt section
   (docs/extensions.md "Custom Tools"). This is exactly what the official example
   and the `pi-extension-template` do; no special pattern is needed.
2. **`setActiveTools` is NOT required** for activation in any mode. Do not call it
   defensively at startup unless coexisting with a governor (see #4).
3. **Run modes**: tui, print (`-p`), and json (`--mode json`) all support
   LLM-invoked custom tools. There is **no print-mode limitation**.
4. **Tool-governor coexistence (the real constraint)**: a third-party extension
   that calls `setActiveTools` with a fixed allowlist (e.g. `pi-loadout`,
   workguard-style governors) will strip a newly-registered tool from the active
   set. For the shipped `watch` tool, mitigate by **distributing it as an installed
   package** (`pi install ...`) so users add `watch` to their loadout/profile, and
   document that it must be enabled in any active loadout. Do **not** rely on a
   governor-free environment.
5. **Distribution / `.pi/` gitignore**: `.pi/extensions/` is gitignored in this
   repo, so project auto-discovery copies are transient. Ship the real extension as
   a proper package (`pi install git:...` / `npm:...`) per docs/packages.md;
   tracked source lives under the repo, not `.pi/`.

---

## Evidence files (this directory)

- `watch-probe.ts` — the probe extension (corrected active-set measurement).
- `run-activation-tests.sh` — model-free matrix runner (load method × mode).
- `report.flag-print.json`, `report.flag-json.json`, `report.autodisc-print.json`
  — original matrix (note: pre-fix `inActive`/`activeToolNames` are unreliable;
  superseded by the clean reports below).
- `report.clean-print.json`, `report.clean-json.json` — corrected probe in a clean
  env: `inAll:true`, `inActive:true` before & after `setActiveTools`.
- `report.diag.json` — diagnostic that revealed `getActiveTools()` returns strings.
- `report.e2e-*.json` — end-to-end model runs (default env = not callable;
  `--no-extensions` = callable, `WATCH_PROBE_OK:hello`).

---

## Open follow-ups for later phases

- **Phase 5 packaging**: decide `watch` distribution (`pi install` source) and
  document the loadout-enable step; confirm it survives a default global loadout.
- **`/watch` command path** may differ from the tool path — verify the command
  (if any) is not also governed by loadout.
- **Throwaway cleanup**: `spikes/01-tool-activation/` is a spike; the real tool is a
  fresh package, not a refactor of `watch-probe.ts`.
- Consider filing the `getActiveTools()` return-shape ambiguity (strings vs
  objects) against the docs — the `getAllTools()` example shows objects and is easy
  to over-generalize to `getActiveTools()`.
