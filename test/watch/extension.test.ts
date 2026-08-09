import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import type { WatchedFrame, WatchedFrameSet } from "../../src/contract/index.js";
import watchExtension, { type WatchInput } from "../../src/watch/extension.js";

const sampleMock = vi.hoisted(() => vi.fn());
vi.mock("../../src/sampler/index.js", () => ({ sample: sampleMock }));

type CapturedTool = {
	name: string;
	execute: (toolCallId: string, params: WatchInput) => Promise<unknown>;
};

type NotifyLevel = "info" | "warning" | "error";
type CapturedCommand = {
	handler: (
		args: string,
		ctx: { ui: { notify: (message: string, level: NotifyLevel) => void } },
	) => Promise<void>;
};

type ExtensionHarness = {
	tools: CapturedTool[];
	commands: Map<string, CapturedCommand>;
	sendUserMessage: ReturnType<typeof vi.fn<(content: string) => void>>;
	notifies: Array<{ message: string; level: NotifyLevel }>;
};

const envKeys = [
	"WATCH_BUDGET",
	"WATCH_RESOLUTION",
	"WATCH_TIER2_BASE_URL",
	"WATCH_TIER2_MODEL",
	"WATCH_TIER2_API_KEY",
	"WATCH_TIER2_LOCAL",
	"WATCH_TIER2_TIMEOUT_MS",
] as const;

let savedEnv: Partial<Record<(typeof envKeys)[number], string>>;

beforeEach(() => {
	savedEnv = {};
	for (const key of envKeys) {
		savedEnv[key] = process.env[key];
		delete process.env[key];
	}
	vi.resetAllMocks();
});

afterEach(() => {
	for (const key of envKeys) {
		const value = savedEnv[key];
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	vi.restoreAllMocks();
});

function frame(overrides: Partial<WatchedFrame> = {}): WatchedFrame {
	return {
		index: 0,
		tMs: 0,
		timestamp: "00:00",
		imageBase64: "FRAME-DATA",
		mediaType: "image/png",
		resolution: "low",
		origin: "scene-cut",
		...overrides,
	};
}

function makeSet(
	ref: string,
	opts: {
		transcriptSource: WatchedFrameSet["source"]["transcriptSource"];
		transcript?: WatchedFrameSet["transcript"];
	},
): WatchedFrameSet {
	const frames = [frame()];
	return {
		source: {
			ref,
			durationMs: 10_000,
			fpsSampled: 0.1,
			frameCount: frames.length,
			transcriptSource: opts.transcriptSource,
		},
		frames,
		transcript: opts.transcript ?? [],
	};
}

function registerExtension(): ExtensionHarness {
	const tools: CapturedTool[] = [];
	const commands = new Map<string, CapturedCommand>();
	const notifies: Array<{ message: string; level: NotifyLevel }> = [];
	const sendUserMessage = vi.fn<(content: string) => void>();

	const pi = {
		registerTool(tool: CapturedTool) {
			tools.push(tool);
		},
		registerCommand(name: string, command: CapturedCommand) {
			commands.set(name, command);
		},
		sendUserMessage,
	} as unknown as ExtensionAPI;

	watchExtension(pi);
	return { tools, commands, sendUserMessage, notifies };
}

function capturedWatch(harness: ExtensionHarness): CapturedTool {
	const watch = harness.tools.find((tool) => tool.name === "watch");
	expect(watch).toBeDefined();
	return watch!;
}

describe("registered watch extension boundary", () => {
	it("preserves a pasted YouTube URL through sampling and chooses transcript tier 1", async () => {
		const ref = "https://youtu.be/BaW_jenozKc";
		const set = makeSet(ref, {
			transcriptSource: "captions",
			transcript: [
				{ startMs: 0, endMs: 2_000, text: "The speaker says hello.", source: "captions" },
			],
		});
		process.env.WATCH_BUDGET = "7";
		process.env.WATCH_RESOLUTION = "low";
		sampleMock.mockResolvedValueOnce(set);

		const result = await capturedWatch(registerExtension()).execute("call-1", {
			ref,
			question: "What did the speaker say?",
		});

		expect(sampleMock).toHaveBeenCalledOnce();
		expect(sampleMock).toHaveBeenCalledWith(
			expect.objectContaining({ ref, budget: 7, resolution: "low" }),
		);
		expect(sampleMock.mock.calls[0]?.[0]).toEqual(
			expect.objectContaining({ onSceneDetectionDiagnostic: expect.any(Function) }),
		);
		expect(result).toMatchObject({
			details: {
				tier: 1,
				intent: "spoken",
				resolution: "low",
				tiers: [1, 2, 3],
				transcriptSource: "captions",
			},
		});
		const details = (result as { details: Record<string, unknown> }).details;
		expect(details.frameCount).toBe(1);
		const content = (result as { content: Array<{ type: string; text?: string }> }).content;
		expect(content.every((part) => part.type === "text")).toBe(true);
		expect(content.map((part) => part.text).join("\n")).toContain("captions");
	});

	it("falls back offline to tier 3 images when transcript and tier 2 are unavailable", async () => {
		const ref = "https://www.youtube.com/shorts/BaW_jenozKc";
		sampleMock.mockResolvedValueOnce(makeSet(ref, { transcriptSource: "none" }));
		const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
			throw new Error("network must not be called for unconfigured tier 2");
		});

		const result = await capturedWatch(registerExtension()).execute("call-2", {
			ref,
			question: "What happens visually?",
		});

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			details: {
				tier: 3,
				intent: "visual",
				resolution: "low",
				tiers: [2, 3],
				frameCount: 1,
				transcriptSource: "none",
			},
		});
		const content = (result as {
			content: Array<{ type: string; data?: string; text?: string }>;
		}).content;
		expect(content).toContainEqual({ type: "image", data: "FRAME-DATA", mimeType: "image/png" });
		expect(content.some((part) => part.text?.includes("tier 3"))).toBe(true);
	});

	it("surfaces a recoverable scene-analysis diagnostic on a successful watch result", async () => {
		const ref = "https://www.youtube.com/watch?v=BaW_jenozKc";
		const diagnostic = {
			reason: "duration-skip" as const,
			durationMs: 700_000,
			limitMs: 600_000,
		};
		sampleMock.mockImplementationOnce(
			async (options: {
				onSceneDetectionDiagnostic?: (value: typeof diagnostic) => void;
			}) => {
				options.onSceneDetectionDiagnostic?.(diagnostic);
				return makeSet(ref, { transcriptSource: "none" });
			},
		);

		const result = await capturedWatch(registerExtension()).execute("call-scene-fallback", {
			ref,
			question: "What happens visually?",
		});

		expect(result).toMatchObject({
			details: {
				tier: 3,
				sceneDetection: diagnostic,
			},
		});
	});

	it("returns a structured, legible error when the sampler rejects a YouTube ref", async () => {
		const ref = "https://youtu.be/BaW_jenozKc";
		const error = new Error("yt-dlp failed to resolve YouTube media (exit 1)");
		sampleMock.mockRejectedValueOnce(error);

		const result = await capturedWatch(registerExtension()).execute("call-3", {
			ref,
			question: "What is said?",
		});

		expect(result).toEqual({
			content: [{ type: "text", text: `watch failed for "${ref}": ${error.message}` }],
			details: { error: error.message, ref },
			isError: true,
		});
	});
});

describe("registered /watch command boundary", () => {
	it("sends one steering message preserving a pasted URL and multi-word question", async () => {
		const harness = registerExtension();
		const command = harness.commands.get("watch");
		expect(command).toBeDefined();
		const ref = "https://youtu.be/BaW_jenozKc";
		const question = "what did the speaker say about the ending?";
		const notify = vi.fn<(message: string, level: NotifyLevel) => void>();

		await command!.handler(`${ref} ${question}`, { ui: { notify } });

		expect(harness.sendUserMessage).toHaveBeenCalledTimes(1);
		expect(harness.sendUserMessage).toHaveBeenCalledWith(
		`Use the watch tool to answer this question about the video "${ref}": ${question}`,
		);
		expect(notify).not.toHaveBeenCalled();
	});

	it("retains the warning notification and does not send on invalid usage", async () => {
		const harness = registerExtension();
		const command = harness.commands.get("watch");
		expect(command).toBeDefined();
		const notify = vi.fn<(message: string, level: NotifyLevel) => void>();

		await command!.handler("only-a-video-ref", { ui: { notify } });

		expect(harness.sendUserMessage).not.toHaveBeenCalled();
		expect(notify).toHaveBeenCalledWith(
		"Usage: /watch <video-path-or-url> <question>",
		"warning",
		);
	});
});
