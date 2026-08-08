import { describe, expect, it } from "vitest";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { normalizeYouTubeUrl } from "../../src/sampler/index.js";
import watchExtension, { type WatchInput } from "../../src/watch/extension.js";

const LIVE_ENABLED = process.env.WATCH_YOUTUBE_LIVE === "1";
const describeLive = LIVE_ENABLED ? describe : describe.skip;
const DEFAULT_YOUTUBE_URL = "https://www.youtube.com/watch?v=BaW_jenozKc";
const DEFAULT_TIMEOUT_MS = 180_000;

interface WatchResult {
	content: Array<{ type: string; text?: string; data?: string }>;
	details: Record<string, unknown>;
	isError?: boolean;
}

type CapturedWatch = {
	name: string;
	execute: (toolCallId: string, params: WatchInput) => Promise<WatchResult>;
};

function liveTimeoutMs(): number {
	const parsed = Number(process.env.WATCH_YOUTUBE_LIVE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function liveYouTubeUrl(): string {
	const ref = process.env.WATCH_YOUTUBE_URL?.trim() || DEFAULT_YOUTUBE_URL;
	try {
		normalizeYouTubeUrl(ref);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`WATCH_YOUTUBE_URL must be a supported public YouTube URL: ${message}`);
	}
	return ref;
}

function registerWatch(): CapturedWatch {
	let watch: CapturedWatch | undefined;
	const pi = {
		registerTool(tool: CapturedWatch) {
			if (tool.name === "watch") watch = tool;
		},
		registerCommand() {},
		sendUserMessage() {},
	} as unknown as ExtensionAPI;

	watchExtension(pi);
	if (!watch) throw new Error("watch extension did not register the watch tool");
	return watch;
}

describeLive("YouTube URL live resolver/sampler/tool proof", () => {
	it(
		"runs a public YouTube URL through the registered watch tool",
		async () => {
			const ref = liveYouTubeUrl();
			const tier2Keys = [
				"WATCH_TIER2_BASE_URL",
				"WATCH_TIER2_MODEL",
				"WATCH_TIER2_API_KEY",
				"WATCH_TIER2_LOCAL",
			] as const;
			const savedTier2Env = Object.fromEntries(
				tier2Keys.map((key) => [key, process.env[key]]),
			) as Record<(typeof tier2Keys)[number], string | undefined>;

			try {
				for (const key of tier2Keys) delete process.env[key];
				const result = await registerWatch().execute("youtube-live", {
					ref,
					question: "What does the speaker say?",
					budget: 1,
					resolution: "low",
				});
				const diagnostic = result.isError
					? result.content.map((part) => part.text ?? "").join("\n")
					: JSON.stringify(result.details);

				expect(
					result.isError,
					`Live YouTube watch failed. Check network access plus current yt-dlp, ffmpeg, and ffprobe installations. ${diagnostic}`,
				).not.toBe(true);
				expect(
					result.content.length,
					`Live YouTube watch returned no content. Details: ${diagnostic}`,
				).toBeGreaterThan(0);
				expect(
					result.details.frameCount,
					`Live YouTube watch returned no sampled frames. Details: ${diagnostic}`,
				).toEqual(expect.any(Number));
				expect(result.details.frameCount as number).toBeGreaterThan(0);
				expect([1, 3]).toContain(result.details.tier);
			} finally {
				for (const key of tier2Keys) {
					const value = savedTier2Env[key];
					if (value === undefined) delete process.env[key];
					else process.env[key] = value;
				}
			}
		},
		liveTimeoutMs(),
	);
});
