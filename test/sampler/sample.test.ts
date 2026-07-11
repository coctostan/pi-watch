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
	cleanup: () => Promise<void>;
}

type FrameImage = { imageBase64: string; mediaType: "image/png" };
type ResolveSourceEffect = (ref: string) => Promise<ResolvedSource>;
type ProbeDurationEffect = (ref: string) => Promise<number>;
type DetectSceneCutsEffect = (
	ref: string,
	durationMs: number,
	threshold?: number,
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

const effects = vi.hoisted(() => ({
	resolveSource: vi.fn<ResolveSourceEffect>(),
	probeDurationMs: vi.fn<ProbeDurationEffect>(),
	detectSceneCutsMs: vi.fn<DetectSceneCutsEffect>(),
	decodeFramesAt: vi.fn<DecodeFramesEffect>(),
	fetchTranscript: vi.fn<FetchTranscriptEffect>(),
}));

vi.mock("../../src/sampler/effects.js", () => effects);

import { sample } from "../../src/sampler/sample.js";

function makeResolvedSource(
	overrides: Partial<ResolvedSource> & Pick<ResolvedSource, "originalRef">,
): ResolvedSource & { cleanup: ReturnType<typeof vi.fn<() => Promise<void>>> } {
	const ownership = overrides.ownership ?? "caller";
	return {
		originalRef: overrides.originalRef,
		mediaRef: overrides.mediaRef ?? overrides.originalRef,
		ownership,
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

	it("never cleans caller-owned refs even when downstream sampling fails", async () => {
		const local = makeResolvedSource({ originalRef: "fixtures/local video.mp4" });
		effects.resolveSource.mockResolvedValue(local);
		effects.probeDurationMs.mockRejectedValue(new Error("probe failed"));

		await expect(sample({ ref: local.originalRef, budget: 2 })).rejects.toThrow("probe failed");

		expect(local.cleanup).not.toHaveBeenCalled();
	});
});
