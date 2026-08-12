import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	ResolutionTier,
	TranscriptSegment,
	TranscriptSource,
} from "../../src/contract/index.js";

interface ResolvedSource {
	originalRef: string;
	mediaRef: string;
	ownership: "caller" | "sampler-temporary";
	urlStartSeconds?: number;
	cleanup: () => Promise<void>;
}

type FrameImage = { imageBase64: string; mediaType: "image/png" };
type SceneDetectionDiagnostic =
	| { reason: "duration-skip"; durationMs: number; limitMs: number }
	| { reason: "timeout-fallback"; timeoutMs: number };
type SceneDetectionOptions = {
	onDiagnostic?: (diagnostic: SceneDetectionDiagnostic) => void;
};
type ResolveSourceEffect = (ref: string) => Promise<ResolvedSource>;
type ProbeDurationEffect = (ref: string) => Promise<number>;
type DetectSceneCutsEffect = (
	ref: string,
	durationMs: number,
	threshold?: number,
	options?: SceneDetectionOptions,
) => Promise<number[]>;
type DecodeFramesEffect = (
	ref: string,
	timesMs: number[],
	resolution: ResolutionTier,
) => Promise<FrameImage[]>;
type FetchTranscriptEffect = (ref: string) => Promise<{
	segments: TranscriptSegment[];
	source: TranscriptSource | "none";
}>;
type LocalAsrPolicy = {
	executable: string;
	model: string;
	maxDurationMs: number;
	timeoutMs: number;
};
type AsrDiagnostic =
	| { reason: "duration-limit"; durationMs: number; limitMs: number }
	| { reason: "missing-executable" | "timeout" | "process-error" | "invalid-output" | "cleanup-error" };
type FetchLocalAsrEffect = (
	mediaRef: string,
	durationMs: number,
	policy: LocalAsrPolicy,
	deps?: unknown,
	onDiagnostic?: (diagnostic: AsrDiagnostic) => void,
) => Promise<{ segments: TranscriptSegment[]; source: "whisper" | "none" }>;

const ASR_POLICY: LocalAsrPolicy = {
	executable: "mlx_whisper",
	model: "mlx-community/whisper-tiny",
	maxDurationMs: 600_000,
	timeoutMs: 300_000,
};

const effects = vi.hoisted(() => ({
	resolveSource: vi.fn<ResolveSourceEffect>(),
	probeDurationMs: vi.fn<ProbeDurationEffect>(),
	detectSceneCutsMs: vi.fn<DetectSceneCutsEffect>(),
	decodeFramesAt: vi.fn<DecodeFramesEffect>(),
	fetchTranscript: vi.fn<FetchTranscriptEffect>(),
}));
const asrEffects = vi.hoisted(() => ({
	fetchLocalAsrTranscript: vi.fn<FetchLocalAsrEffect>(),
}));

vi.mock("../../src/sampler/effects.js", () => effects);
vi.mock("../../src/sampler/asr.js", () => asrEffects);

import { sample } from "../../src/sampler/sample.js";

function makeResolvedSource(
	overrides: Partial<ResolvedSource> & Pick<ResolvedSource, "originalRef">,
): ResolvedSource & { cleanup: ReturnType<typeof vi.fn<() => Promise<void>>> } {
	const ownership = overrides.ownership ?? "caller";
	return {
		originalRef: overrides.originalRef,
		mediaRef: overrides.mediaRef ?? overrides.originalRef,
		ownership,
		...(overrides.urlStartSeconds === undefined
			? {}
			: { urlStartSeconds: overrides.urlStartSeconds }),
		cleanup: vi.fn(async () => undefined),
	};
}

function arrangeSuccessfulSampling(): void {
	effects.probeDurationMs.mockResolvedValue(3000);
	effects.detectSceneCutsMs.mockResolvedValue([1000, 2000]);
	effects.decodeFramesAt.mockImplementation(async (_ref, timesMs) =>
		timesMs.map((_, index) => ({ imageBase64: `IMAGE_${index}`, mediaType: "image/png" })),
	);
	effects.fetchTranscript.mockResolvedValue({ segments: [], source: "none" });
	asrEffects.fetchLocalAsrTranscript.mockResolvedValue({ segments: [], source: "none" });
}

beforeEach(() => {
	vi.clearAllMocks();
	arrangeSuccessfulSampling();
});

describe("sample() source resolution lifecycle", () => {
	it("borrows local refs without download cleanup and keeps source.ref as the caller ref", async () => {
		const local = makeResolvedSource({ originalRef: "fixtures/local video.mp4" });
		effects.resolveSource.mockResolvedValue(local);

		const result = await sample({ ref: "fixtures/local video.mp4", budget: 2 });

		expect(effects.resolveSource).toHaveBeenCalledTimes(1);
		expect(effects.resolveSource).toHaveBeenCalledWith("fixtures/local video.mp4");
		expect(effects.probeDurationMs).toHaveBeenCalledWith("fixtures/local video.mp4");
		expect(effects.detectSceneCutsMs).toHaveBeenCalledWith("fixtures/local video.mp4", 3000);
		expect(effects.decodeFramesAt.mock.calls[0]?.[0]).toBe("fixtures/local video.mp4");
		expect(effects.fetchTranscript).toHaveBeenCalledWith("fixtures/local video.mp4");
		expect(result.source.ref).toBe("fixtures/local video.mp4");
		expect(local.cleanup).not.toHaveBeenCalled();
	});

	it("uses resolved mediaRef for ffprobe/ffmpeg while preserving original ref for transcript and output", async () => {
		const originalRef = "https://youtu.be/dQw4w9WgXcQ?si=tracking";
		const mediaRef = "/tmp/pi-watch-youtube-owned/video.mp4";
		const resolved = makeResolvedSource({
			originalRef,
			mediaRef,
			ownership: "sampler-temporary",
		});
		effects.resolveSource.mockResolvedValue(resolved);

		const result = await sample({
			ref: originalRef,
			budget: 3,
			resolution: "high",
			sceneThreshold: 0.25,
		});

		expect(effects.resolveSource).toHaveBeenCalledWith(originalRef);
		expect(effects.probeDurationMs).toHaveBeenCalledWith(mediaRef);
		expect(effects.detectSceneCutsMs).toHaveBeenCalledWith(mediaRef, 3000, 0.25);
		expect(effects.decodeFramesAt.mock.calls[0]?.[0]).toBe(mediaRef);
		expect(effects.decodeFramesAt.mock.calls[0]?.[2]).toBe("high");
		expect(effects.fetchTranscript).toHaveBeenCalledWith(originalRef);
		expect(result.source.ref).toBe(originalRef);
		expect(resolved.cleanup).toHaveBeenCalledTimes(1);
	});

	it("forwards scene fallback diagnostics without letting a consumer failure break sampling", async () => {
		const ref = "fixtures/long.mp4";
		const diagnostic: SceneDetectionDiagnostic = {
			reason: "duration-skip",
			durationMs: 700_000,
			limitMs: 600_000,
		};
		const onSceneDetectionDiagnostic = vi.fn(() => {
			throw new Error("diagnostic consumer failed");
		});
		effects.resolveSource.mockResolvedValue(makeResolvedSource({ originalRef: ref }));
		effects.detectSceneCutsMs.mockImplementation(async (_mediaRef, _durationMs, _threshold, options) => {
			options?.onDiagnostic?.(diagnostic);
			return [];
		});

		await expect(
			sample({ ref, budget: 2, onSceneDetectionDiagnostic }),
		).resolves.toMatchObject({ source: { ref }, frames: expect.any(Array) });
		expect(effects.detectSceneCutsMs).toHaveBeenCalledWith(
			ref,
			3000,
			undefined,
			expect.objectContaining({ onDiagnostic: expect.any(Function) }),
		);
		expect(onSceneDetectionDiagnostic).toHaveBeenCalledWith(diagnostic);
	});

	it("cleans sampler-owned media exactly once when sampling succeeds", async () => {
		const resolved = makeResolvedSource({
			originalRef: "https://youtube.com/watch?v=dQw4w9WgXcQ",
			mediaRef: "/tmp/pi-watch-youtube-owned/video.mp4",
			ownership: "sampler-temporary",
		});
		effects.resolveSource.mockResolvedValue(resolved);

		await sample({ ref: resolved.originalRef, budget: 2 });

		expect(resolved.cleanup).toHaveBeenCalledTimes(1);
	});

	it("cleans sampler-owned media exactly once when failure happens before frame decode", async () => {
		const resolved = makeResolvedSource({
			originalRef: "https://youtube.com/watch?v=dQw4w9WgXcQ",
			mediaRef: "/tmp/pi-watch-youtube-owned/video.mp4",
			ownership: "sampler-temporary",
		});
		effects.resolveSource.mockResolvedValue(resolved);
		effects.probeDurationMs.mockRejectedValue(new Error("probe failed"));

		await expect(sample({ ref: resolved.originalRef, budget: 2 })).rejects.toThrow("probe failed");

		expect(effects.decodeFramesAt).not.toHaveBeenCalled();
		expect(resolved.cleanup).toHaveBeenCalledTimes(1);
	});

	it("cleans sampler-owned media exactly once when failure happens after frame decode", async () => {
		const resolved = makeResolvedSource({
			originalRef: "https://youtube.com/watch?v=dQw4w9WgXcQ",
			mediaRef: "/tmp/pi-watch-youtube-owned/video.mp4",
			ownership: "sampler-temporary",
		});
		effects.resolveSource.mockResolvedValue(resolved);
		effects.fetchTranscript.mockRejectedValue(new Error("transcript failed after decode"));

		await expect(sample({ ref: resolved.originalRef, budget: 2 })).rejects.toThrow(
			"transcript failed after decode",
		);

		expect(effects.decodeFramesAt).toHaveBeenCalledTimes(1);
		expect(resolved.cleanup).toHaveBeenCalledTimes(1);
	});

	it("preserves both downstream sampling and cleanup failures", async () => {
		const resolved = makeResolvedSource({
			originalRef: "https://youtube.com/watch?v=dQw4w9WgXcQ",
			mediaRef: "/tmp/pi-watch-youtube-owned/video.mp4",
			ownership: "sampler-temporary",
		});
		resolved.cleanup.mockRejectedValue(new Error("cleanup failed"));
		effects.resolveSource.mockResolvedValue(resolved);
		effects.probeDurationMs.mockRejectedValue(new Error("probe failed"));

		const error = await sample({ ref: resolved.originalRef, budget: 2 }).catch((err) => err);

		expect(error).toBeInstanceOf(AggregateError);
		expect(error.message).toMatch(/probe failed.*cleanup failed/i);
		expect(error.errors).toEqual([
			expect.objectContaining({ message: "probe failed" }),
			expect.objectContaining({ message: "cleanup failed" }),
		]);
		expect(resolved.cleanup).toHaveBeenCalledTimes(1);
	});

	it("never cleans caller-owned refs even when downstream sampling fails", async () => {
		const local = makeResolvedSource({ originalRef: "fixtures/local video.mp4" });
		effects.resolveSource.mockResolvedValue(local);
		effects.probeDurationMs.mockRejectedValue(new Error("probe failed"));

		await expect(sample({ ref: local.originalRef, budget: 2 })).rejects.toThrow("probe failed");

		expect(local.cleanup).not.toHaveBeenCalled();
	});

	it("carries caption segments from the original YouTube ref onto the validated shared timeline", async () => {
		const originalRef = "https://youtu.be/dQw4w9WgXcQ?si=tracking";
		const mediaRef = "/tmp/pi-watch-youtube-owned/video.mp4";
		const resolved = makeResolvedSource({
			originalRef,
			mediaRef,
			ownership: "sampler-temporary",
		});
		const captions: TranscriptSegment[] = [
			{ startMs: 250, endMs: 900, text: "hello", source: "captions" },
			{ startMs: 1500, endMs: 2200, text: "world", source: "captions" },
		];
		effects.resolveSource.mockResolvedValue(resolved);
		effects.fetchTranscript.mockResolvedValue({ segments: captions, source: "captions" });

		const result = await sample({ ref: originalRef, budget: 3, resolution: "high" });

		expect(effects.fetchTranscript).toHaveBeenCalledWith(originalRef);
		expect(effects.probeDurationMs).toHaveBeenCalledWith(mediaRef);
		expect(effects.detectSceneCutsMs).toHaveBeenCalledWith(mediaRef, 3000);
		expect(effects.decodeFramesAt.mock.calls[0]?.[0]).toBe(mediaRef);
		expect(effects.decodeFramesAt.mock.calls[0]?.[2]).toBe("high");
		expect(result.source).toMatchObject({ ref: originalRef, transcriptSource: "captions" });
		expect(result.transcript).toEqual(captions);
		expect(result.transcript.every((segment) => Number.isInteger(segment.startMs) && Number.isInteger(segment.endMs))).toBe(
			true,
		);
		expect(resolved.cleanup).toHaveBeenCalledTimes(1);
	});
});


describe("sample() captions-first local ASR composition", () => {
	it("uses originalRef for captions and suppresses ASR when captions are usable", async () => {
		const originalRef = "https://youtu.be/dQw4w9WgXcQ";
		const mediaRef = "/tmp/owned/video.mp4";
		effects.resolveSource.mockResolvedValue(
			makeResolvedSource({ originalRef, mediaRef, ownership: "sampler-temporary" }),
		);
		effects.fetchTranscript.mockResolvedValue({
			segments: [{ startMs: 0, endMs: 1000, text: "caption", source: "captions" }],
			source: "captions",
		});

		const result = await sample({ ref: originalRef, localAsr: ASR_POLICY });

		expect(effects.fetchTranscript).toHaveBeenCalledWith(originalRef);
		expect(asrEffects.fetchLocalAsrTranscript).not.toHaveBeenCalled();
		expect(result.source.transcriptSource).toBe("captions");
	});

	it("uses mediaRef and probed duration for ASR only after a caption miss", async () => {
		const originalRef = "https://youtu.be/dQw4w9WgXcQ";
		const mediaRef = "/tmp/owned/video.mp4";
		const resolved = makeResolvedSource({
			originalRef,
			mediaRef,
			ownership: "sampler-temporary",
		});
		effects.resolveSource.mockResolvedValue(resolved);
		asrEffects.fetchLocalAsrTranscript.mockResolvedValue({
			segments: [{ startMs: 100, endMs: 900, text: "spoken", source: "whisper" }],
			source: "whisper",
		});
		const onAsrDiagnostic = vi.fn<(diagnostic: AsrDiagnostic) => void>();

		const result = await sample({ ref: originalRef, localAsr: ASR_POLICY, onAsrDiagnostic });

		expect(effects.fetchTranscript).toHaveBeenCalledWith(originalRef);
		expect(asrEffects.fetchLocalAsrTranscript).toHaveBeenCalledWith(
			mediaRef,
			3000,
			ASR_POLICY,
			undefined,
			expect.any(Function),
		);
		expect(result.source.transcriptSource).toBe("whisper");
		expect(result.transcript).toEqual([
			{ startMs: 100, endMs: 900, text: "spoken", source: "whisper" },
		]);
		expect(resolved.cleanup).toHaveBeenCalledTimes(1);
	});

	it("preserves none and resolver ownership when ASR fails", async () => {
		const resolved = makeResolvedSource({
			originalRef: "local.mp4",
			mediaRef: "local.mp4",
			ownership: "caller",
		});
		effects.resolveSource.mockResolvedValue(resolved);
		asrEffects.fetchLocalAsrTranscript.mockResolvedValue({ segments: [], source: "none" });

		const result = await sample({ ref: "local.mp4", localAsr: ASR_POLICY });

		expect(result.source.transcriptSource).toBe("none");
		expect(result.transcript).toEqual([]);
		expect(resolved.cleanup).not.toHaveBeenCalled();
	});

	it("does not call ASR when no local policy is supplied", async () => {
		effects.resolveSource.mockResolvedValue(makeResolvedSource({ originalRef: "local.mp4" }));
		await sample({ ref: "local.mp4" });
		expect(asrEffects.fetchLocalAsrTranscript).not.toHaveBeenCalled();
	});
});

describe("sample() range-aware evidence", () => {
	it("uses explicit bounds over URL start for transcript, frames, fps, and available coverage", async () => {
		const originalRef = "https://youtu.be/dQw4w9WgXcQ?t=2m";
		const resolved = makeResolvedSource({
			originalRef,
			mediaRef: "/tmp/owned/range.mp4",
			ownership: "sampler-temporary",
			urlStartSeconds: 2,
		});
		effects.resolveSource.mockResolvedValue(resolved);
		effects.probeDurationMs.mockResolvedValue(10_000);
		effects.detectSceneCutsMs.mockResolvedValue([1_000, 4_000, 7_000, 9_000]);
		effects.fetchTranscript.mockResolvedValue({
			source: "captions",
			segments: [
				{ startMs: 3_000, endMs: 4_500, text: "cross start", source: "captions" },
				{ startMs: 7_500, endMs: 9_000, text: "cross end", source: "captions" },
			],
		});

		const result = await sample({ ref: originalRef, start: 4, end: 8, budget: 2 });

		expect(effects.detectSceneCutsMs).toHaveBeenCalledWith(resolved.mediaRef, 10_000);
		expect(effects.decodeFramesAt).toHaveBeenCalledWith(
			resolved.mediaRef,
			[4_000, 7_000],
			"low",
		);
		expect(result.source).toMatchObject({
			durationMs: 10_000,
			fpsSampled: 0.5,
			range: { startMs: 4_000, endMs: 8_000 },
			available: {
				frames: { count: 2, firstMs: 4_000, lastMs: 7_000 },
				transcript: { count: 2, firstMs: 4_000, lastMs: 8_000 },
			},
		});
		expect(result.frames.map((frame) => frame.tMs)).toEqual([4_000, 7_000]);
		expect(result.transcript).toEqual([
			{ startMs: 4_000, endMs: 4_500, text: "cross start", source: "captions" },
			{ startMs: 7_500, endMs: 8_000, text: "cross end", source: "captions" },
		]);
	});

	it("uses URL start when explicit start is absent and disables tier-1 evidence when no cue intersects", async () => {
		const originalRef = "https://youtu.be/dQw4w9WgXcQ?t=5";
		effects.resolveSource.mockResolvedValue(
			makeResolvedSource({ originalRef, urlStartSeconds: 5 }),
		);
		effects.probeDurationMs.mockResolvedValue(10_000);
		effects.fetchTranscript.mockResolvedValue({
			source: "captions",
			segments: [{ startMs: 0, endMs: 1_000, text: "outside", source: "captions" }],
		});

		const result = await sample({ ref: originalRef, budget: 1 });

		expect(result.source.range).toEqual({ startMs: 5_000, endMs: 10_000 });
		expect(result.source.transcriptSource).toBe("none");
		expect(result.transcript).toEqual([]);
		expect(result.frames[0]?.tMs).toBeGreaterThanOrEqual(5_000);
	});

	it("clips eligible ASR evidence through the same range", async () => {
		effects.resolveSource.mockResolvedValue(makeResolvedSource({ originalRef: "local.mp4" }));
		effects.probeDurationMs.mockResolvedValue(10_000);
		asrEffects.fetchLocalAsrTranscript.mockResolvedValue({
			source: "whisper",
			segments: [
				{ startMs: 1_000, endMs: 3_000, text: "outside", source: "whisper" },
				{ startMs: 5_000, endMs: 9_000, text: "inside", source: "whisper" },
			],
		});

		const result = await sample({
			ref: "local.mp4",
			start: 4,
			end: 8,
			localAsr: ASR_POLICY,
		});

		expect(result.transcript).toEqual([
			{ startMs: 5_000, endMs: 8_000, text: "inside", source: "whisper" },
		]);
		expect(result.source.transcriptSource).toBe("whisper");
	});

	it("rejects an invalid effective range before scene analysis or frame decoding", async () => {
		effects.resolveSource.mockResolvedValue(makeResolvedSource({ originalRef: "local.mp4" }));
		effects.probeDurationMs.mockResolvedValue(10_000);

		await expect(sample({ ref: "local.mp4", start: 10 })).rejects.toThrow(/start.*duration/i);
		expect(effects.detectSceneCutsMs).not.toHaveBeenCalled();
		expect(effects.decodeFramesAt).not.toHaveBeenCalled();
	});
});
