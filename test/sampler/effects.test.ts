import { describe, it, expect, vi } from "vitest";
import { parseDurationMs, parseSceneCutsMs } from "../../src/sampler/index.js";
import * as samplerExports from "../../src/sampler/index.js";

/**
 * Pure-parser unit tests for the effect layer. These spawn NOTHING — they feed
 * representative ffprobe/ffmpeg output strings (captured from the real tools)
 * straight into the exported parsers, so they are fast and deterministic.
 */

describe("parseDurationMs (AC-1)", () => {
	it("maps ffprobe seconds output to integer milliseconds", () => {
		expect(parseDurationMs("12.345\n")).toBe(12345);
		expect(parseDurationMs("3.000000\n")).toBe(3000);
		expect(parseDurationMs("0.5")).toBe(500);
	});

	it("rounds fractional milliseconds", () => {
		expect(parseDurationMs("1.2345")).toBe(1235); // 1234.5 -> 1235
	});

	it("throws on N/A or empty output", () => {
		expect(() => parseDurationMs("N/A")).toThrow();
		expect(() => parseDurationMs("")).toThrow();
		expect(() => parseDurationMs("   \n")).toThrow();
	});

	it("throws on unparseable output", () => {
		expect(() => parseDurationMs("not-a-number")).toThrow();
		expect(() => parseDurationMs("-1.0")).toThrow();
	});
});

describe("parseSceneCutsMs (AC-2)", () => {
	/** A representative ffmpeg `select=...,showinfo` stderr blob (real format). */
	const showinfo = [
		"[Parsed_showinfo_1 @ 0x87b066700] config in time_base: 1/10240, frame_rate: 10/1",
		"[Parsed_showinfo_1 @ 0x87b066700] config out time_base: 0/0, frame_rate: 0/0",
		"[Parsed_showinfo_1 @ 0x87b066700] n:   0 pts:  10240 pts_time:1       duration:1024 fmt:yuv420p s:128x128 i:P iskey:1 type:I",
		"[Parsed_showinfo_1 @ 0x87b066700] n:   1 pts:  20480 pts_time:2.05    duration:1024 fmt:yuv420p s:128x128 i:P iskey:1 type:I",
	].join("\n");

	it("extracts ascending integer ms offsets within [0, durationMs)", () => {
		expect(parseSceneCutsMs(showinfo, 3000)).toEqual([1000, 2050]);
	});

	it("drops offsets at or beyond durationMs", () => {
		// durationMs = 2000 excludes the 2.05s (2050ms) cut.
		expect(parseSceneCutsMs(showinfo, 2000)).toEqual([1000]);
	});

	it("ignores frame_rate / time_base lines that have no pts_time", () => {
		const noise = "config in time_base: 1/10240, frame_rate: 10/1\nframe_rate: 0/0";
		expect(parseSceneCutsMs(noise, 5000)).toEqual([]);
	});

	it("returns [] for empty input and de-duplicates repeated offsets", () => {
		expect(parseSceneCutsMs("", 5000)).toEqual([]);
		const dupes = "pts_time:1\npts_time:1.0\npts_time:1";
		expect(parseSceneCutsMs(dupes, 5000)).toEqual([1000]);
	});
});

type SourceClassification =
	| {
			kind: "youtube";
			originalRef: string;
			videoId: string;
			canonicalUrl: string;
		}
	| { kind: "local"; originalRef: string; mediaRef: string };

type NormalizeYouTubeUrl = (ref: string) => { videoId: string; canonicalUrl: string };
type ClassifySourceRef = (ref: string) => SourceClassification;
type ResolveSource = (ref: string, deps?: ResolveSourceDeps) => Promise<ResolvedSource>;

type SourceOwnership = "caller" | "sampler-temporary";

interface ResolvedSource {
	originalRef: string;
	mediaRef: string;
	ownership: SourceOwnership;
	cleanup: () => Promise<void>;
}

interface RunOptions {
	timeoutMs?: number;
	maxBuffer?: number;
}

interface RunResult {
	stdout: Buffer;
	stderr: Buffer;
}

interface ResolveSourceDeps {
	mkdtemp: (prefix: string) => Promise<string>;
	rm: (path: string, opts: { recursive: true; force: true }) => Promise<void>;
	run: (bin: string, args: readonly string[], opts?: RunOptions) => Promise<RunResult>;
}

function exportedFunction<T>(name: string): T {
	const value = (samplerExports as Record<string, unknown>)[name];
	expect(value, `${name} must be exported from src/sampler/index.js`).toBeTypeOf("function");
	return value as T;
}

function youtubeId(): string {
	return "dQw4w9WgXcQ";
}

function makeResolverDeps(stdout: string) {
	const tempDir = "/tmp/pi-watch-youtube-test-owned";
	const run = vi.fn<ResolveSourceDeps["run"]>(async () => ({
		stdout: Buffer.from(stdout, "utf8"),
		stderr: Buffer.alloc(0),
	}));
	const mkdtemp = vi.fn<ResolveSourceDeps["mkdtemp"]>(async (prefix) => {
		expect(prefix).toMatch(/pi-watch.*youtube/i);
		return tempDir;
	});
	const rm = vi.fn<ResolveSourceDeps["rm"]>(async () => undefined);
	return { deps: { mkdtemp, rm, run }, tempDir };
}

describe("source URL classification and canonicalization", () => {
	it("canonicalizes supported exact YouTube URL forms and drops query noise", () => {
		const normalizeYouTubeUrl = exportedFunction<NormalizeYouTubeUrl>("normalizeYouTubeUrl");
		const id = youtubeId();
		const cases = [
			`https://youtube.com/watch?v=${id}&feature=share&t=30s`,
			`http://youtube.com/watch?feature=share&v=${id}&si=tracking`,
			`https://www.youtube.com/watch?feature=share&v=${id}&si=tracking`,
			`https://youtu.be/${id}?si=tracking&t=30`,
			`https://youtube.com/shorts/${id}?feature=share`,
		];

		for (const input of cases) {
			expect(normalizeYouTubeUrl(input)).toEqual({
				videoId: id,
				canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
			});
		}
	});

	it("classifies supported YouTube refs separately from borrowed local refs", () => {
		const classifySourceRef = exportedFunction<ClassifySourceRef>("classifySourceRef");
		const id = youtubeId();

		expect(classifySourceRef(`https://youtu.be/${id}?si=tracking`)).toEqual({
			kind: "youtube",
			originalRef: `https://youtu.be/${id}?si=tracking`,
			videoId: id,
			canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
		});
		expect(classifySourceRef("fixtures/local video.mp4")).toEqual({
			kind: "local",
			originalRef: "fixtures/local video.mp4",
			mediaRef: "fixtures/local video.mp4",
		});
		expect(classifySourceRef("/tmp/youtube.com/watch?v=dQw4w9WgXcQ.mp4")).toEqual({
			kind: "local",
			originalRef: "/tmp/youtube.com/watch?v=dQw4w9WgXcQ.mp4",
			mediaRef: "/tmp/youtube.com/watch?v=dQw4w9WgXcQ.mp4",
		});
	});

	it("rejects malformed supported URLs, deceptive hosts, and unsupported HTTP URLs", () => {
		const classifySourceRef = exportedFunction<ClassifySourceRef>("classifySourceRef");
		const invalid = [
			"https://youtube.com/watch",
			"https://youtube.com/watch?v=too-short",
			"https://youtube.com/shorts/",
			"https://youtu.be/",
			"https://youtube.com.example/watch?v=dQw4w9WgXcQ",
			"https://m.youtube.com/watch?v=dQw4w9WgXcQ",
			"https://notyoutube.com/watch?v=dQw4w9WgXcQ",
			"https://vimeo.com/123456",
			"http://example.test/video.mp4",
		];

		for (const input of invalid) {
			expect(() => classifySourceRef(input), input).toThrow(/youtube|unsupported|video id|host/i);
		}
	});
});

describe("resolveSource()", () => {
	it("borrows local refs byte-for-byte without spawning or deleting caller files", async () => {
		const resolveSource = exportedFunction<ResolveSource>("resolveSource");
		const { deps } = makeResolverDeps("");

		const resolved = await resolveSource("./fixtures/local video.mp4", deps);

		expect(resolved).toMatchObject({
			originalRef: "./fixtures/local video.mp4",
			mediaRef: "./fixtures/local video.mp4",
			ownership: "caller",
		});
		expect(deps.mkdtemp).not.toHaveBeenCalled();
		expect(deps.run).not.toHaveBeenCalled();
		await resolved.cleanup();
		expect(deps.rm).not.toHaveBeenCalled();
	});

	it("downloads supported YouTube refs once through bounded argv-only yt-dlp into owned temp output", async () => {
		const resolveSource = exportedFunction<ResolveSource>("resolveSource");
		const id = youtubeId();
		const { deps, tempDir } = makeResolverDeps(`${tempDirPath("video.mp4")}\n`);

		const resolved = await resolveSource(`https://youtu.be/${id}?si=tracking`, deps);

		expect(deps.run).toHaveBeenCalledTimes(1);
		const [bin, args, opts] = deps.run.mock.calls[0]!;
		expect(bin).toBe("yt-dlp");
		expect(Array.isArray(args)).toBe(true);
		expect((opts as Record<string, unknown> | undefined)?.shell).toBeUndefined();
		expect(opts?.timeoutMs).toBeGreaterThan(0);
		expect(opts?.timeoutMs).toBeLessThanOrEqual(60_000);
		expect(opts?.maxBuffer).toBeGreaterThan(0);
		expect(opts?.maxBuffer).toBeLessThanOrEqual(64 * 1024 * 1024);
		expect(args).toContain("--no-playlist");
		expect(args).toContain("--print");
		expect(args).toContain("after_move:filepath");
		expect(args).toContain(`https://www.youtube.com/watch?v=${id}`);
		expect(args).not.toContain(`https://youtu.be/${id}?si=tracking`);
		const outputIndex = args.indexOf("-o");
		expect(outputIndex).toBeGreaterThanOrEqual(0);
		expect(args[outputIndex + 1]).toBe(`${tempDir}/%(id)s.%(ext)s`);
		expect(resolved).toMatchObject({
			originalRef: `https://youtu.be/${id}?si=tracking`,
			mediaRef: tempDirPath("video.mp4"),
			ownership: "sampler-temporary",
		});

		await resolved.cleanup();
		await resolved.cleanup();
		expect(deps.rm).toHaveBeenCalledTimes(1);
		expect(deps.rm).toHaveBeenCalledWith(tempDir, { recursive: true, force: true });
	});

	it.each([
		{
			name: "missing binary",
			err: Object.assign(new Error("spawn yt-dlp ENOENT"), { code: "ENOENT" }),
			message: /yt-dlp.*(not found|missing|install)/i,
		},
		{
			name: "timeout",
			err: Object.assign(new Error("killed"), { killed: true }),
			message: /yt-dlp.*timed out|timeout/i,
		},
		{
			name: "non-zero exit",
			err: Object.assign(new Error("exit 1"), { code: 1, stderr: Buffer.from("ERROR: unavailable") }),
			message: /yt-dlp.*(exited|failed).*1|unavailable/i,
		},
	])("cleans owned temp directories and reports $name download failures", async ({ err, message }) => {
		const resolveSource = exportedFunction<ResolveSource>("resolveSource");
		const { deps, tempDir } = makeResolverDeps("");
		deps.run = vi.fn<ResolveSourceDeps["run"]>(async () => {
			throw err;
		});

		await expect(resolveSource(`https://youtu.be/${youtubeId()}`, deps)).rejects.toThrow(message);
		expect(deps.rm).toHaveBeenCalledTimes(1);
		expect(deps.rm).toHaveBeenCalledWith(tempDir, { recursive: true, force: true });
	});

	it("preserves both the download and cleanup failures", async () => {
		const resolveSource = exportedFunction<ResolveSource>("resolveSource");
		const { deps } = makeResolverDeps("");
		deps.run = vi.fn<ResolveSourceDeps["run"]>(async () => {
			throw Object.assign(new Error("exit 1"), { code: 1, stderr: Buffer.from("download failed") });
		});
		deps.rm.mockRejectedValue(new Error("cleanup failed"));

		const error = await resolveSource(`https://youtu.be/${youtubeId()}`, deps).catch((err) => err);

		expect(error).toBeInstanceOf(AggregateError);
		expect(error.message).toMatch(/download failed.*cleanup failed/i);
		expect(error.errors).toEqual([
			expect.objectContaining({ message: expect.stringMatching(/download failed/i) }),
			expect.objectContaining({ message: "cleanup failed" }),
		]);
	});

	it.each([
		{ name: "absent output", stdout: "", message: /yt-dlp.*(no|missing).*output|downloaded file/i },
		{
			name: "ambiguous output",
			stdout: `${tempDirPath("a.mp4")}\n${tempDirPath("b.mp4")}\n`,
			message: /yt-dlp.*(ambiguous|multiple).*output/i,
		},
		{
			name: "unsafe output path",
			stdout: "/tmp/not-owned/video.mp4\n",
			message: /outside.*temporary|unsafe.*output|owned/i,
		},
	])("cleans owned temp directories and rejects $name", async ({ stdout, message }) => {
		const resolveSource = exportedFunction<ResolveSource>("resolveSource");
		const { deps, tempDir } = makeResolverDeps(stdout);

		await expect(resolveSource(`https://youtu.be/${youtubeId()}`, deps)).rejects.toThrow(message);
		expect(deps.rm).toHaveBeenCalledTimes(1);
		expect(deps.rm).toHaveBeenCalledWith(tempDir, { recursive: true, force: true });
	});
});

function tempDirPath(basename: string): string {
	return `/tmp/pi-watch-youtube-test-owned/${basename}`;
}
