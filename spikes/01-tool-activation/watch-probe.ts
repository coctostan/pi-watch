/**
 * watch-probe.ts — Tool-activation spike probe (Phase 01).
 *
 * THROWAWAY. This is NOT the real `watch` tool. Its only job is to prove —
 * or characterize — whether a pi-extension-registered custom tool enters the
 * active tool set and is executable end-to-end.
 *
 * It registers a single trivial tool (`watch_probe`) and runs a model-free
 * self-diagnostic on `session_start` that records active-set membership
 * before/after `pi.setActiveTools(...)` to a JSON report file.
 *
 * See spikes/01-tool-activation/FINDINGS.md for the resulting activation recipe.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";

const WATCH_PROBE_PARAMS = Type.Object({
	message: Type.String({ description: "Message to echo" }),
});

export type WatchProbeInput = Static<typeof WATCH_PROBE_PARAMS>;

const DEFAULT_REPORT_PATH = "spikes/01-tool-activation/activation-report.json";

function reportPath(): string {
	return process.env.WATCH_PROBE_REPORT || DEFAULT_REPORT_PATH;
}

export default function watchProbeExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "watch_probe",
		label: "Watch Probe",
		description:
			"Activation probe for pi-watch. Echoes its message back with a sentinel marker.",
		promptSnippet: "Probe pi-watch tool activation by echoing a message with a sentinel marker",
		promptGuidelines: ["Use watch_probe when asked to probe tool activation."],
		parameters: WATCH_PROBE_PARAMS,
		async execute(_toolCallId, params: WatchProbeInput) {
			return {
				content: [{ type: "text" as const, text: `WATCH_PROBE_OK:${params.message}` }],
				details: { tool: "watch_probe" },
			};
		},
	});

	pi.on("session_start", (_event, ctx) => {
		const path = reportPath();
		try {
			const hasProbe = (tools: { name: string }[]) =>
				tools.some((t) => t.name === "watch_probe");

			const before = {
				inAll: hasProbe(pi.getAllTools()),
				inActive: hasProbe(pi.getActiveTools()),
			};

			// Union the probe into the active set — never drop existing tools.
			const currentActiveNames = pi.getActiveTools().map((t) => t.name);
			const unionNames = Array.from(new Set([...currentActiveNames, "watch_probe"]));
			pi.setActiveTools(unionNames);

			const after = {
				inAll: hasProbe(pi.getAllTools()),
				inActive: hasProbe(pi.getActiveTools()),
			};

			const report = {
				mode: ctx.mode,
				hasUI: ctx.hasUI,
				timestamp: new Date().toISOString(),
				before,
				after,
				allToolNames: pi.getAllTools().map((t) => t.name),
				activeToolNames: pi.getActiveTools().map((t) => t.name),
			};

			mkdirSync(dirname(path), { recursive: true });
			writeFileSync(path, JSON.stringify(report, null, 2));

			if (ctx.hasUI) {
				ctx.ui.notify(`watch-probe: report written to ${path}`, "info");
			}
		} catch (e) {
			try {
				mkdirSync(dirname(path), { recursive: true });
				writeFileSync(path, JSON.stringify({ error: String(e) }, null, 2));
			} catch {
				// Best-effort: nothing more we can do if even the error write fails.
			}
			if (ctx.hasUI) {
				ctx.ui.notify(`watch-probe: diagnostic failed: ${String(e)}`, "error");
			}
		}
	});

	pi.registerCommand("watch-probe-report", {
		description: "Print the latest watch-probe activation report path and content.",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) return;
			const path = reportPath();
			if (!existsSync(path)) {
				ctx.ui.notify(`watch-probe: no report at ${path}`, "warning");
				return;
			}
			ctx.ui.notify(`watch-probe report (${path}):\n${readFileSync(path, "utf8")}`, "info");
		},
	});
}
