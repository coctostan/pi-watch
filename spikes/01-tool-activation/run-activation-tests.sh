#!/usr/bin/env bash
#
# run-activation-tests.sh — Model-free activation matrix for the watch-probe spike.
#
# Exercises load-method × run-mode combinations and relies ENTIRELY on the
# session_start self-diagnostic in watch-probe.ts (no live LLM required).
# Each scenario points WATCH_PROBE_REPORT at a distinct JSON results file and
# runs a trivial prompt so a session starts and the diagnostic fires.
#
# Idempotent and safe to re-run. Never deletes tracked files. The throwaway
# auto-discovery copy under .pi/extensions/ is removed via a cleanup trap.

set -euo pipefail

SPIKE_DIR="spikes/01-tool-activation"
PROBE="$SPIKE_DIR/watch-probe.ts"
AUTODISC_COPY=".pi/extensions/watch-probe.ts"

# --- cleanup: always remove the throwaway auto-discovery copy ---------------
cleanup() {
	rm -f "$AUTODISC_COPY" 2>/dev/null || true
	# Remove the dir only if we created it and it is now empty.
	rmdir .pi/extensions 2>/dev/null || true
}
trap cleanup EXIT

# --- helper: print a one-line summary of a report file ----------------------
# Uses node (jq may be absent). Reads mode/before/after; tolerates missing file.
summarize() {
	local label="$1" file="$2"
	if [ ! -f "$file" ]; then
		echo "  [$label] NO REPORT FILE ($file)"
		return
	fi
	echo "  [$label] $file:"
	cat "$file"
	echo ""
	node -e '
		const f = process.argv[1];
		try {
			const r = JSON.parse(require("node:fs").readFileSync(f, "utf8"));
			if (r.error) { console.log("    parsed: error=" + r.error); process.exit(0); }
			const b = r.before || {}, a = r.after || {};
			console.log("    parsed: mode=" + r.mode +
				" inAll=" + b.inAll +
				" inActive(before)=" + b.inActive +
				" inActive(after)=" + a.inActive);
		} catch (e) { console.log("    parse failed: " + String(e)); }
	' "$file"
	echo ""
}

echo "=================================================================="
echo " watch-probe activation matrix (model-free, session_start diag)"
echo "=================================================================="

# --- Scenario A: flag-load + print -----------------------------------------
echo ""
echo ">>> Scenario A: flag-load (-e) + print (-p)"
A_REPORT="$SPIKE_DIR/report.flag-print.json"
WATCH_PROBE_REPORT="$A_REPORT" pi -e "./$PROBE" -p "noop" >/dev/null 2>&1 || true
summarize "A flag+print" "$A_REPORT"

# --- Scenario B: flag-load + json mode -------------------------------------
echo ">>> Scenario B: flag-load (-e) + json (--mode json)"
B_REPORT="$SPIKE_DIR/report.flag-json.json"
if WATCH_PROBE_REPORT="$B_REPORT" pi -e "./$PROBE" --mode json -p "noop" >/dev/null 2>&1; then
	summarize "B flag+json" "$B_REPORT"
else
	echo "  [B flag+json] json mode unavailable on this build (--mode json failed) — skipping"
	echo ""
fi

# --- Scenario C: project-local auto-discovery + print ----------------------
echo ">>> Scenario C: auto-discovery (.pi/extensions/) + print (-p)"
C_REPORT="$SPIKE_DIR/report.autodisc-print.json"
mkdir -p .pi/extensions
cp "$PROBE" "$AUTODISC_COPY"
# NOTE: no -e flag — relies on project-local auto-discovery (requires trust).
WATCH_PROBE_REPORT="$C_REPORT" pi -p "noop" >/dev/null 2>&1 || true
if [ -f "$C_REPORT" ]; then
	summarize "C autodisc+print" "$C_REPORT"
else
	echo "  [C autodisc+print] NO REPORT — probe did not load under auto-discovery."
	echo "  Likely cause: project trust gating (untrusted project skips .pi/extensions/)."
	echo "  This is itself a finding; recording rather than failing."
	echo ""
fi
rm -f "$AUTODISC_COPY"

# --- Compact matrix table ---------------------------------------------------
echo "=================================================================="
echo " MATRIX: scenario | mode | inAll | inActive(before) | inActive(after)"
echo "=================================================================="
node -e '
	const fs = require("node:fs");
	const rows = [
		["A flag+print",    process.argv[1]],
		["B flag+json",     process.argv[2]],
		["C autodisc+print",process.argv[3]],
	];
	const pad = (s, n) => String(s).padEnd(n);
	for (const [label, file] of rows) {
		let mode = "-", inAll = "-", before = "-", after = "-";
		try {
			const r = JSON.parse(fs.readFileSync(file, "utf8"));
			if (r.error) { mode = "ERR"; }
			else {
				mode = r.mode ?? "-";
				inAll = (r.before && r.before.inAll) ?? "-";
				before = (r.before && r.before.inActive) ?? "-";
				after = (r.after && r.after.inActive) ?? "-";
			}
		} catch { mode = "(no report)"; }
		console.log(" " + pad(label,18) + "| " + pad(mode,7) + "| " +
			pad(inAll,6) + "| " + pad(before,17) + "| " + after);
	}
' "$A_REPORT" "$B_REPORT" "$C_REPORT"
echo "=================================================================="
echo "Done. Reports: $SPIKE_DIR/report.*.json"
