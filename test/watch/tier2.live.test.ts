import { describe, it, expect } from "vitest";
import {
	buildTier2Request,
	parseTier2Answer,
	type Tier2Config,
} from "../../src/watch/index.js";
import type { WatchedFrameSet } from "../../src/contract/index.js";

const LIVE_ENABLED = process.env.WATCH_TIER2_LIVE === "1";
const describeLive = LIVE_ENABLED ? describe : describe.skip;

// 64x64 solid-red PNG generated from raw RGB pixels. Keeping this as a literal
// avoids requiring ffmpeg for the opt-in live adapter proof.
const RED_PNG_BASE64 =
	"iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAS0lEQVR42u3PQQkAAAgAsetfWiP4FgYrsKZeS0BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEDgsqnc8OJg6Ln3AAAAAElFTkSuQmCC";

function makeRedFrameSet(): WatchedFrameSet {
	return {
		source: {
			ref: "live-red-frame.png",
			durationMs: 1000,
			fpsSampled: 1,
			frameCount: 1,
			transcriptSource: "none",
		},
		frames: [
			{
				index: 0,
				tMs: 0,
				timestamp: "00:00",
				imageBase64: RED_PNG_BASE64,
				mediaType: "image/png",
				resolution: "low",
				origin: "scene-cut",
			},
		],
		transcript: [],
	};
}

function requireLiveConfig(): Tier2Config {
	const baseURL = process.env.WATCH_TIER2_BASE_URL?.trim();
	const model = process.env.WATCH_TIER2_MODEL?.trim();
	if (!baseURL || !model) {
		throw new Error(
			"WATCH_TIER2_LIVE=1 requires WATCH_TIER2_BASE_URL and WATCH_TIER2_MODEL",
		);
	}

	const apiKey = process.env.WATCH_TIER2_API_KEY?.trim();
	return apiKey ? { baseURL, model, apiKey } : { baseURL, model };
}

function liveTimeoutMs(): number {
	const parsed = Number(process.env.WATCH_TIER2_LIVE_TIMEOUT_MS ?? 120_000);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 120_000;
}

describeLive("tier 2 live OpenAI-compatible wire-shape proof", () => {
	it(
		"posts buildTier2Request output to the live endpoint and parses a red-frame answer",
		async () => {
			const config = requireLiveConfig();
			const question = "What color is the frame? Answer with one word.";
			const { url, init } = buildTier2Request(makeRedFrameSet(), question, config);

			expect(url).toBe(
				`${config.baseURL.replace(/\/+$/, "")}/chat/completions`,
			);

			const body = JSON.parse(String(init.body)) as {
				messages: Array<{
					content: Array<{ type: string; image_url?: { url: string } }>;
				}>;
			};
			const content = body.messages[0]?.content ?? [];
			expect(content.some((part) => part.type === "text")).toBe(true);
			expect(
				content.some(
					(part) =>
						part.type === "image_url" &&
						part.image_url?.url.startsWith("data:image/png;base64,"),
				),
			).toBe(true);

			const response = await fetch(url, init);
			const raw = await response.text();
			expect(response.ok, `HTTP ${response.status}: ${raw.slice(0, 1000)}`).toBe(
				true,
			);

			const json = JSON.parse(raw) as unknown;
			const answer = parseTier2Answer(json);
			expect(answer, `raw response: ${raw.slice(0, 1000)}`).toEqual(
				expect.any(String),
			);
			expect(answer!.toLowerCase()).toContain("red");
		},
		liveTimeoutMs(),
	);
});
