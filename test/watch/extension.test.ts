import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

import type { WatchedFrame, WatchedFrameSet } from "../../src/contract/index.js";
import watchExtension, { type WatchBatchInput, type WatchInput } from "../../src/watch/extension.js";
import { TIER2_UNCONFIGURED_HINT } from "../../src/watch/tier2.js";

const sampleMock = vi.hoisted(() => vi.fn());
vi.mock("../../src/sampler/index.js", () => ({ sample: sampleMock }));

type CapturedTool = {
	name: string;
	description: string;
	parameters: { properties: Record<string, { maximum?: number; minimum?: number }> };
	execute: (toolCallId: string, params: WatchInput | WatchBatchInput) => Promise<unknown>;
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
	"WATCH_ASR_LOCAL",
	"WATCH_ASR_EXECUTABLE",
	"WATCH_ASR_MODEL",
	"WATCH_ASR_MAX_DURATION_MS",
	"WATCH_ASR_TIMEOUT_MS",
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
	const transcript = opts.transcript ?? [];
	return {
		source: {
			ref,
			durationMs: 10_000,
			fpsSampled: 0.1,
			frameCount: frames.length,
			transcriptSource: opts.transcriptSource,
			range: { startMs: 0, endMs: 10_000 },
			available: {
				frames: { count: frames.length, firstMs: 0, lastMs: 0 },
				transcript: {
					count: transcript.length,
					firstMs: transcript[0]?.startMs ?? null,
					lastMs: transcript.at(-1)?.endMs ?? null,
				},
			},
		},
		frames,
		transcript,
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

function capturedWatchBatch(harness: ExtensionHarness): CapturedTool {
	const batch = harness.tools.find((tool) => tool.name === "watch_batch");
	expect(batch).toBeDefined();
	return batch!;
}

type CapturedResult = {
	content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
};

function expectBoundedToolText(result: unknown): CapturedResult {
	const captured = result as CapturedResult;
	const text = captured.content
		.filter((part) => part.type === "text")
		.map((part) => part.text ?? "")
		.join("\n");
	expect(text.split("\n").length).toBeLessThanOrEqual(DEFAULT_MAX_LINES);
	expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(DEFAULT_MAX_BYTES);
	return captured;
}

describe("registered watch extension boundary", () => {
	it("documents Pi's transcript output limits in the tool description", () => {
		const watch = capturedWatch(registerExtension());
		expect(watch.description).toContain("50 KB");
		expect(watch.description).toContain("2,000-line");
	});
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

	it("bounds the final tier-3 result after appending the unconfigured-tier hint", async () => {
		const ref = "https://www.youtube.com/watch?v=BaW_jenozKc";
		const transcript = Array.from({ length: DEFAULT_MAX_LINES + 500 }, (_, index) => ({
			startMs: index * 1_000,
			endMs: (index + 1) * 1_000,
			text: "caption line",
			source: "captions" as const,
		}));
		sampleMock.mockResolvedValueOnce(
			makeSet(ref, { transcriptSource: "captions", transcript }),
		);

		const result = await capturedWatch(registerExtension()).execute("call-large-tier-3", {
			ref,
			question: "What happens visually?",
		});
		const captured = expectBoundedToolText(result);
		expect(captured.content.some((part) => part.text?.includes("Tool result truncated"))).toBe(true);
		expect(captured.content.at(-1)).toEqual({
			type: "text",
			text: TIER2_UNCONFIGURED_HINT,
		});
		const imageIndex = captured.content.findIndex((part) => part.type === "image");
		expect(captured.content[imageIndex - 1]?.text).toContain("Frame 0 @ 00:00");
		expect(captured.content.filter((part) => part.type === "image")).toHaveLength(1);
	});

	it("bounds a byte-heavy Unicode question on the final tier-3 result", async () => {
		const ref = "clip.mp4";
		sampleMock.mockResolvedValueOnce(makeSet(ref, { transcriptSource: "none" }));

		const result = await capturedWatch(registerExtension()).execute("call-unicode-tier-3", {
			ref,
			question: `What happens visually? ${"🙂".repeat(DEFAULT_MAX_BYTES)}`,
		});
		const captured = expectBoundedToolText(result);
		const text = captured.content
			.filter((part) => part.type === "text")
			.map((part) => part.text ?? "")
			.join("\n");
		expect(text).toContain("Question: What happens visually?");
		expect(text).toContain("question truncated");
		expect(text).toContain(TIER2_UNCONFIGURED_HINT);
		const imageIndex = captured.content.findIndex((part) => part.type === "image");
		expect(captured.content[imageIndex - 1]?.text).toContain("Frame 0 @ 00:00");
		expect(captured.content.filter((part) => part.type === "image")).toHaveLength(1);
	});

	it("bounds a multiline question on the final tier-1 result", async () => {
		const ref = "clip.mp4";
		sampleMock.mockResolvedValueOnce(
			makeSet(ref, {
				transcriptSource: "captions",
				transcript: [
					{ startMs: 0, endMs: 1_000, text: "hello", source: "captions" },
				],
			}),
		);

		const result = await capturedWatch(registerExtension()).execute("call-multiline-tier-1", {
			ref,
			question: "What is said?\n".repeat(DEFAULT_MAX_LINES + 500),
		});
		const captured = expectBoundedToolText(result);
		const text = captured.content.map((part) => part.text ?? "").join("\n");
		expect(text).toContain("Question: What is said?");
		expect(text).toContain("question truncated");
		expect(text).toContain("00:00 hello");
		expect(captured.content.every((part) => part.type === "text")).toBe(true);
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

	it("throws a contextual error when the sampler rejects a YouTube ref", async () => {
		const ref = "https://youtu.be/BaW_jenozKc";
		const error = new Error("yt-dlp failed to resolve YouTube media (exit 1)");
		sampleMock.mockRejectedValueOnce(error);

		await expect(
			capturedWatch(registerExtension()).execute("call-3", {
				ref,
				question: "What is said?",
			}),
		).rejects.toThrow(`watch failed for "${ref}": ${error.message}`);
	});
});


describe("registered local ASR eligibility and diagnostics", () => {
	it("passes local ASR only for enabled spoken intent and surfaces a private failure diagnostic", async () => {
		process.env.WATCH_ASR_LOCAL = "1";
		const ref = "/private/user/spoken.mp4";
		const diagnostic = { reason: "missing-executable" as const };
		sampleMock.mockImplementationOnce(
			async (options: { onAsrDiagnostic?: (value: typeof diagnostic) => void }) => {
				options.onAsrDiagnostic?.(diagnostic);
				return makeSet(ref, { transcriptSource: "none" });
			},
		);

		const result = await capturedWatch(registerExtension()).execute("call-asr", {
			ref,
			question: "What did the speaker say?",
		});

		expect(sampleMock).toHaveBeenCalledWith(
			expect.objectContaining({
				ref,
				localAsr: {
					executable: "mlx_whisper",
					model: "mlx-community/whisper-tiny",
					maxDurationMs: 600_000,
					timeoutMs: 300_000,
				},
				onAsrDiagnostic: expect.any(Function),
			}),
		);
		expect(result).toMatchObject({ details: { asr: diagnostic, transcriptSource: "none" } });
		expect(JSON.stringify((result as { details: unknown }).details)).not.toContain(ref);
	});

	it.each([
		["What happens visually?", "visual"],
		["What text is shown on screen?", "on-screen-text"],
	])("does not pass ASR for %s intent", async (question, _intent) => {
		process.env.WATCH_ASR_LOCAL = "1";
		sampleMock.mockResolvedValueOnce(makeSet("clip.mp4", { transcriptSource: "none" }));

		const result = await capturedWatch(registerExtension()).execute("call-ineligible", {
			ref: "clip.mp4",
			question,
		});

		const options = sampleMock.mock.calls[0]?.[0] as Record<string, unknown>;
		expect(options).not.toHaveProperty("localAsr");
		expect(options).not.toHaveProperty("onAsrDiagnostic");
		expect((result as { details: Record<string, unknown> }).details).not.toHaveProperty("asr");
	});

	it("uses identical per-item gating and returns indexed private diagnostics for batch", async () => {
		process.env.WATCH_ASR_LOCAL = "1";
		const diagnostic = { reason: "timeout" as const };
		sampleMock
			.mockImplementationOnce(
				async (options: { onAsrDiagnostic?: (value: typeof diagnostic) => void }) => {
					options.onAsrDiagnostic?.(diagnostic);
					return makeSet("spoken.mp4", { transcriptSource: "none" });
				},
			)
			.mockResolvedValueOnce(makeSet("visual.mp4", { transcriptSource: "none" }));

		const result = await capturedWatchBatch(registerExtension()).execute("batch-asr", {
			items: [
				{ ref: "spoken.mp4", question: "What was said?" },
				{ ref: "visual.mp4", question: "What happens visually?" },
			],
		});

		expect(sampleMock.mock.calls[0]?.[0]).toEqual(
			expect.objectContaining({ localAsr: expect.any(Object), onAsrDiagnostic: expect.any(Function) }),
		);
		expect(sampleMock.mock.calls[1]?.[0]).not.toHaveProperty("localAsr");
		expect(result).toMatchObject({ details: { asr: [{ index: 0, diagnostic }] } });
		const detailsText = JSON.stringify((result as { details: unknown }).details);
		expect(detailsText).not.toMatch(/spoken\.mp4|visual\.mp4|transcript|stderr/i);
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

describe("registered range and evidence boundary", () => {
	it("registers conversion-safe whole-second bounds and forwards them to single and batch sampling", async () => {
		const harness = registerExtension();
		const watch = capturedWatch(harness);
		const batch = capturedWatchBatch(harness);
		const maximum = Math.floor(Number.MAX_SAFE_INTEGER / 1000);
		expect(watch.parameters.properties.start).toMatchObject({ minimum: 0, maximum });
		expect(watch.parameters.properties.end).toMatchObject({ minimum: 0, maximum });
		expect(batch.parameters.properties.start).toMatchObject({ minimum: 0, maximum });
		expect(batch.parameters.properties.end).toMatchObject({ minimum: 0, maximum });

		sampleMock
			.mockResolvedValueOnce(makeSet("single.mp4", { transcriptSource: "none" }))
			.mockResolvedValueOnce(makeSet("batch.mp4", { transcriptSource: "none" }));
		await watch.execute("range-single", {
			ref: "single.mp4",
			question: "What happens visually?",
			start: 4,
			end: 8,
		});
		await batch.execute("range-batch", {
			items: [{ ref: "batch.mp4", question: "What happens visually?" }],
			start: 10,
			end: 20,
		});

		expect(sampleMock.mock.calls[0]?.[0]).toEqual(
			expect.objectContaining({ start: 4, end: 8 }),
		);
		expect(sampleMock.mock.calls[1]?.[0]).toEqual(
			expect.objectContaining({ start: 10, end: 20 }),
		);
	});

	it("reports available separately from transcript evidence retained after the final bound", async () => {
		const transcript = Array.from({ length: DEFAULT_MAX_LINES + 500 }, (_, index) => ({
			startMs: index * 1_000,
			endMs: (index + 1) * 1_000,
			text: `synthetic line ${index}`,
			source: "captions" as const,
		}));
		sampleMock.mockResolvedValueOnce(
			makeSet("range.mp4", { transcriptSource: "captions", transcript }),
		);

		const result = (await capturedWatch(registerExtension()).execute("range-truncated", {
			ref: "range.mp4",
			question: "What was said?",
		})) as { details: Record<string, any>; content: Array<{ type: string; text?: string }> };

		expect(result.details.availableEvidence.transcript).toEqual({
			count: transcript.length,
			firstMs: 0,
			lastMs: transcript.at(-1)!.endMs,
		});
		expect(result.details.returnedEvidence.transcript.count).toBeLessThan(transcript.length);
		expect(result.details.returnedEvidence.transcript.firstMs).toBe(0);
		expect(result.details.returnedEvidence.transcript.lastMs).toBeLessThan(
			transcript.at(-1)!.endMs,
		);
		expect(result.details.truncation.final).toBe(true);
		expect(JSON.stringify(result.details)).not.toMatch(/range\.mp4|synthetic line|What was said/i);
	});
});
