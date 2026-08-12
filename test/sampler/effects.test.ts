import { describe, it, expect, vi } from "vitest";
import {
	parseDurationMs,
	parseSceneCutsMs,
	ProcessTimeoutError,
	detectSceneCutsMs,
} from "../../src/sampler/index.js";
import type { SceneDetectionOptions } from "../../src/sampler/index.js";
import type { TranscriptSegment } from "../../src/contract/index.js";
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


describe("detectSceneCutsMs bounded effect", () => {
	const emptyResult = { stdout: Buffer.alloc(0), stderr: Buffer.from("pts_time:1.25") };

	it("uses the reduced-rate, reduced-resolution scene argv", async () => {
		const run = vi.fn<NonNullable<SceneDetectionOptions["run"]>>(async () => emptyResult);

		await expect(detectSceneCutsMs("clip.mp4", 3_000, 0.25, { run })).resolves.toEqual([1250]);
		expect(run).toHaveBeenCalledWith(
			"ffmpeg",
			[
				"-nostdin",
				"-i",
				"clip.mp4",
				"-vf",
				"fps=2,scale=320:-2,select='gt(scene,0.25)',showinfo",
				"-f",
				"null",
				"-",
			],
			expect.objectContaining({ timeoutMs: 60_000 }),
		);
	});

	it("skips scene analysis above the ten-minute limit without spawning", async () => {
		const run = vi.fn<NonNullable<SceneDetectionOptions["run"]>>(async () => emptyResult);
		const onDiagnostic = vi.fn();

		await expect(
			detectSceneCutsMs("long.mp4", 10 * 60_000 + 1, 0.4, { run, onDiagnostic }),
		).resolves.toEqual([]);
		expect(run).not.toHaveBeenCalled();
		expect(onDiagnostic).toHaveBeenCalledWith({
			reason: "duration-skip",
			durationMs: 10 * 60_000 + 1,
			limitMs: 10 * 60_000,
		});
	});

	it("falls back only for the typed scene-process timeout", async () => {
		const run = vi.fn<NonNullable<SceneDetectionOptions["run"]>>(async () => {
			throw new ProcessTimeoutError("ffmpeg", 1_234);
		});
		const onDiagnostic = vi.fn();

		await expect(
			detectSceneCutsMs("clip.mp4", 3_000, 0.4, { run, timeoutMs: 1_234, onDiagnostic }),
		).resolves.toEqual([]);
		expect(onDiagnostic).toHaveBeenCalledWith({ reason: "timeout-fallback", timeoutMs: 1_234 });
	});

	it("propagates non-timeout scene failures", async () => {
		const failure = new Error("invalid media");
		const run = vi.fn<NonNullable<SceneDetectionOptions["run"]>>(async () => {
			throw failure;
		});

		await expect(detectSceneCutsMs("clip.mp4", 3_000, 0.4, { run })).rejects.toBe(failure);
	});

	it("does not let a diagnostic callback failure break the fallback", async () => {
		const run = vi.fn<NonNullable<SceneDetectionOptions["run"]>>(async () => {
			throw new ProcessTimeoutError("ffmpeg", 60_000);
		});
		const onDiagnostic = vi.fn(() => {
			throw new Error("diagnostic consumer failed");
		});

		await expect(detectSceneCutsMs("clip.mp4", 3_000, 0.4, { run, onDiagnostic })).resolves.toEqual([]);
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
		expect(args).toContain("--ignore-config");
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


type ParseWebVtt = (input: string) => TranscriptSegment[];
type FetchTranscriptResult = {
	segments: TranscriptSegment[];
	source: "captions" | "none";
};
type FetchTranscript = (
	ref: string,
	deps?: CaptionDeps,
) => Promise<FetchTranscriptResult>;

interface CaptionEntry {
	name: string;
	isFile: () => boolean;
}

interface CaptionDeps {
	mkdtemp: (prefix: string) => Promise<string>;
	rm: (path: string, opts: { recursive: true; force: true }) => Promise<void>;
	run: (bin: string, args: readonly string[], opts?: RunOptions) => Promise<RunResult>;
	readdir: (path: string) => Promise<CaptionEntry[]>;
	readFile: (path: string, encoding: "utf8") => Promise<string>;
	stat: (path: string) => Promise<{ size: number }>;
}

const captionVtt = (text: string): string =>
	[`WEBVTT`, ``, `00:00:01.000 --> 00:00:02.000`, text, ``].join("\n");

function captionEntry(name: string, isFile = true): CaptionEntry {
	return { name, isFile: () => isFile };
}

function makeCaptionDeps(files: Record<string, string> = {}) {
	const tempDir = "/tmp/pi-watch-caption-test-owned";
	const mkdtemp = vi.fn<CaptionDeps["mkdtemp"]>(async (prefix) => {
		expect(prefix).toMatch(/pi-watch.*caption/i);
		return tempDir;
	});
	const rm = vi.fn<CaptionDeps["rm"]>(async () => undefined);
	const run = vi.fn<CaptionDeps["run"]>(async () => ({
		stdout: Buffer.alloc(0),
		stderr: Buffer.alloc(0),
	}));
	const readdir = vi.fn<CaptionDeps["readdir"]>(async () =>
		Object.keys(files).map((name) => captionEntry(name)),
	);
	const stat = vi.fn<CaptionDeps["stat"]>(async (path) => {
		const name = path.split("/").at(-1) ?? "";
		return { size: Buffer.byteLength(files[name] ?? "", "utf8") };
	});
	const readFile = vi.fn<CaptionDeps["readFile"]>(async (path) => {
		const name = path.split("/").at(-1) ?? "";
		const value = files[name];
		if (value === undefined) throw new Error(`missing test caption ${name}`);
		return value;
	});
	return { deps: { mkdtemp, rm, run, readdir, stat, readFile }, tempDir };
}

describe("parseWebVtt() caption core (AC-1)", () => {
	it("parses headers, identifiers, both timestamp forms, settings, multiline text, and markup", () => {
		const parseWebVtt = exportedFunction<ParseWebVtt>("parseWebVtt");
		const input = [
			"WEBVTT - Example captions",
			"",
			"NOTE this note is ignored",
			"not a cue",
			"",
			"cue-two",
			"01:02.250 --> 01:03.000 align:start position:10%",
			"<v Speaker><b>Hello</b> <00:01:02.700>world</v>",
			"next line",
			"",
			"cue-one",
			"00:00:01.000 --> 00:00:02.500 line:90%",
			"Earlier <i>caption</i>",
		].join("\n");

		expect(parseWebVtt(input)).toEqual([
			{
				startMs: 1000,
				endMs: 2500,
				text: "Earlier caption",
				source: "captions",
			},
			{
				startMs: 62250,
				endMs: 63000,
				text: "Hello world\nnext line",
				source: "captions",
			},
		]);
	});

	it("decodes the WebVTT character references used in cue text", () => {
		const parseWebVtt = exportedFunction<ParseWebVtt>("parseWebVtt");
		const input = captionVtt("Tom &amp; Jerry &lt;3 &gt; 2&nbsp;ok &lrm;L &rlm;R");

		expect(parseWebVtt(input)[0]?.text).toBe(
			"Tom & Jerry <3 > 2\u00a0ok \u200eL \u200fR",
		);
	});

	it("drops notes, blank or tag-only cues, malformed timings, reversed ranges, and preserves stable order", () => {
		const parseWebVtt = exportedFunction<ParseWebVtt>("parseWebVtt");
		const input = [
			"WEBVTT",
			"",
			"NOTE",
			"00:00:00.000 --> 00:00:01.000",
			"not parsed as a note cue",
			"",
			"bad-time",
			"00:00:xx.000 --> 00:00:02.000",
			"malformed",
			"",
			"reversed",
			"00:03.000 --> 00:02.000",
			"reversed",
			"",
			"blank",
			"00:00:02.000 --> 00:00:03.000",
			"   ",
			"",
			"tag-only",
			"00:00:03.000 --> 00:00:04.000",
			"<c.yellow></c>",
			"",
			"later",
			"00:00:04.000 --> 00:00:05.000",
			"later",
			"",
			"same-start-second",
			"00:00:04.000 --> 00:00:06.000",
			"same start second",
			"",
			"same-start-first",
			"00:00:04.000 --> 00:00:05.500",
			"same start first",
		].join("\n");

		expect(parseWebVtt(input)).toEqual([
			{ startMs: 4000, endMs: 5000, text: "later", source: "captions" },
			{ startMs: 4000, endMs: 6000, text: "same start second", source: "captions" },
			{ startMs: 4000, endMs: 5500, text: "same start first", source: "captions" },
		]);
	});
});

describe("fetchTranscript() caption effect (AC-2/AC-3)", () => {
	it("bypasses every caption effect for local refs", async () => {
		const fetchTranscript = exportedFunction<FetchTranscript>("fetchTranscript");
		const { deps } = makeCaptionDeps({ "captions.vtt": captionVtt("must not be read") });

		expect(await fetchTranscript("fixtures/local video.mp4", deps)).toEqual({
			segments: [],
			source: "none",
		});
		expect(deps.mkdtemp).not.toHaveBeenCalled();
		expect(deps.run).not.toHaveBeenCalled();
		expect(deps.readdir).not.toHaveBeenCalled();
		expect(deps.readFile).not.toHaveBeenCalled();
		expect(deps.rm).not.toHaveBeenCalled();
	});

	it("uses the canonical original URL and one bounded subtitle-only human request", async () => {
		const fetchTranscript = exportedFunction<FetchTranscript>("fetchTranscript");
		const noisyRef = `https://youtu.be/${youtubeId()}?si=tracking&t=30`;
		const { deps, tempDir } = makeCaptionDeps({
			"human.en.vtt": captionVtt("human caption"),
		});

		const result = await fetchTranscript(noisyRef, deps);
		expect(result).toEqual({
			segments: [{ startMs: 1000, endMs: 2000, text: "human caption", source: "captions" }],
			source: "captions",
		});
		expect(deps.run).toHaveBeenCalledTimes(1);
		const [bin, args, opts] = deps.run.mock.calls[0]!;
		expect(bin).toBe("yt-dlp");
		expect(Array.isArray(args)).toBe(true);
		expect((opts as Record<string, unknown> | undefined)?.shell).toBeUndefined();
		expect(opts?.timeoutMs).toBeGreaterThan(0);
		expect(opts?.timeoutMs).toBeLessThanOrEqual(60_000);
		expect(opts?.maxBuffer).toBeGreaterThan(0);
		expect(opts?.maxBuffer).toBeLessThanOrEqual(64 * 1024 * 1024);
		expect(args).toContain("--ignore-config");
		expect(args).toContain("--no-playlist");
		expect(args).toContain("--skip-download");
		expect(args).toContain("--write-subs");
		expect(args).toContain("--sub-format");
		expect(args[args.indexOf("--sub-format") + 1]).toBe("vtt");
		expect(args).toContain(`https://www.youtube.com/watch?v=${youtubeId()}`);
		expect(args).not.toContain(noisyRef);
		expect(args).not.toContain("-f");
		const outputIndex = args.indexOf("-o");
		expect(outputIndex).toBeGreaterThanOrEqual(0);
		expect(args[outputIndex + 1]).toMatch(new RegExp(`^${tempDir}/`));
		expect(deps.readFile).toHaveBeenCalledWith(`${tempDir}/human.en.vtt`, "utf8");
		expect(deps.rm).toHaveBeenCalledTimes(1);
		expect(deps.rm).toHaveBeenCalledWith(tempDir, { recursive: true, force: true });
	});

	it.each([
		{ name: "empty", human: "" },
		{ name: "malformed", human: "WEBVTT\n\n00:00:xx.000 --> 00:01.000\nbad" },
	])("attempts automatic captions exactly once after $name human captions", async ({ human }) => {
		const fetchTranscript = exportedFunction<FetchTranscript>("fetchTranscript");
		const { deps } = makeCaptionDeps();
		let attempts = 0;
		deps.run.mockImplementation(async () => {
			attempts += 1;
			return { stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
		});
		deps.readdir.mockImplementation(async () =>
			attempts === 1 ? [captionEntry("human.vtt")] : [captionEntry("auto.vtt")],
		);
		deps.readFile.mockImplementation(async (path) =>
			path.endsWith("human.vtt") ? human : captionVtt("automatic caption"),
		);

		const result = await fetchTranscript(`https://www.youtube.com/watch?v=${youtubeId()}`, deps);
		expect(result).toEqual({
			segments: [{ startMs: 1000, endMs: 2000, text: "automatic caption", source: "captions" }],
			source: "captions",
		});
		expect(deps.run).toHaveBeenCalledTimes(2);
		expect(deps.run.mock.calls[0]?.[1]).toContain("--write-subs");
		expect(deps.run.mock.calls[0]?.[1]).not.toContain("--write-auto-subs");
		expect(deps.run.mock.calls[1]?.[1]).toContain("--write-auto-subs");
		expect(deps.run.mock.calls.every((call) => call[1].includes("--skip-download"))).toBe(true);
		expect(deps.rm).toHaveBeenCalledTimes(1);
	});

	it("prefers the first valid candidate in deterministic filename order", async () => {
		const fetchTranscript = exportedFunction<FetchTranscript>("fetchTranscript");
		const { deps } = makeCaptionDeps({
			"z.vtt": captionVtt("z caption"),
			"a.vtt": captionVtt("a caption"),
			"notes.txt": "not WebVTT",
		});
		deps.readdir.mockResolvedValue([
			captionEntry("z.vtt"),
			captionEntry("notes.txt"),
			captionEntry("nested.vtt", false),
			captionEntry("a.vtt"),
		]);

		const result = await fetchTranscript(`https://www.youtube.com/shorts/${youtubeId()}?feature=share`, deps);
		expect(result.segments[0]?.text).toBe("a caption");
		expect(deps.readFile.mock.calls[0]?.[0]).toBe(`${"/tmp/pi-watch-caption-test-owned"}/a.vtt`);
		expect(deps.readFile).toHaveBeenCalledTimes(1);
	});

	it("skips oversized caption files before reading and degrades to none", async () => {
		const fetchTranscript = exportedFunction<FetchTranscript>("fetchTranscript");
		const { deps, tempDir } = makeCaptionDeps({
			"oversized.vtt": captionVtt("must not be allocated"),
		});
		deps.stat.mockResolvedValue({ size: 16 * 1024 * 1024 + 1 });

		await expect(
			fetchTranscript(`https://www.youtube.com/watch?v=${youtubeId()}`, deps),
		).resolves.toEqual({ segments: [], source: "none" });
		expect(deps.run).toHaveBeenCalledTimes(2);
		expect(deps.stat).toHaveBeenCalledTimes(2);
		expect(deps.stat).toHaveBeenCalledWith(`${tempDir}/oversized.vtt`);
		expect(deps.readFile).not.toHaveBeenCalled();
		expect(deps.rm).toHaveBeenCalledTimes(1);
	});

	it.each([
		{
			name: "missing binary",
			configure: (deps: ReturnType<typeof makeCaptionDeps>["deps"]) => {
				deps.run.mockRejectedValue(Object.assign(new Error("spawn yt-dlp ENOENT"), { code: "ENOENT" }));
			},
		},
		{
			name: "timeout",
			configure: (deps: ReturnType<typeof makeCaptionDeps>["deps"]) => {
				deps.run.mockRejectedValue(Object.assign(new Error("timed out"), { killed: true }));
			},
		},
		{
			name: "non-zero exit",
			configure: (deps: ReturnType<typeof makeCaptionDeps>["deps"]) => {
				deps.run.mockRejectedValue(Object.assign(new Error("exit 1"), { code: 1 }));
			},
		},
		{
			name: "no VTT output",
			configure: (deps: ReturnType<typeof makeCaptionDeps>["deps"]) => {
				deps.run.mockResolvedValue({ stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) });
				deps.readdir.mockResolvedValue([]);
			},
		},
		{
			name: "unsafe and non-VTT candidates",
			configure: (deps: ReturnType<typeof makeCaptionDeps>["deps"]) => {
				deps.readdir.mockResolvedValue([
					captionEntry("../outside.vtt"),
					captionEntry("outside.txt"),
					captionEntry("directory.vtt", false),
				]);
			},
		},
		{
			name: "caption read failure",
			configure: (deps: ReturnType<typeof makeCaptionDeps>["deps"]) => {
				deps.readdir.mockResolvedValue([captionEntry("broken.vtt")]);
				deps.readFile.mockRejectedValue(new Error("read failed"));
			},
		},
	])("degrades $name to none and cleans created storage exactly once", async ({ configure }) => {
		const fetchTranscript = exportedFunction<FetchTranscript>("fetchTranscript");
		const { deps, tempDir } = makeCaptionDeps();
		configure(deps);

		await expect(fetchTranscript(`https://www.youtube.com/watch?v=${youtubeId()}`, deps)).resolves.toEqual({
			segments: [],
			source: "none",
		});
		expect(deps.rm).toHaveBeenCalledTimes(1);
		expect(deps.rm).toHaveBeenCalledWith(tempDir, { recursive: true, force: true });
	});

	it("degrades temporary-directory setup and cleanup failures without throwing", async () => {
		const fetchTranscript = exportedFunction<FetchTranscript>("fetchTranscript");
		const setup = makeCaptionDeps();
		setup.deps.mkdtemp.mockRejectedValue(new Error("temp setup failed"));
		expect(await fetchTranscript(`https://www.youtube.com/watch?v=${youtubeId()}`, setup.deps)).toEqual({
			segments: [],
			source: "none",
		});
		expect(setup.deps.rm).not.toHaveBeenCalled();

		const cleanup = makeCaptionDeps({ "human.vtt": captionVtt("caption") });
		cleanup.deps.rm.mockRejectedValue(new Error("cleanup failed"));
		expect(await fetchTranscript(`https://www.youtube.com/watch?v=${youtubeId()}`, cleanup.deps)).toEqual({
			segments: [],
			source: "none",
		});
		expect(cleanup.deps.rm).toHaveBeenCalledTimes(1);
	});

	describe("range metadata on supported YouTube refs", () => {
		it("keeps a conversion-safe timestamp as start-only classification metadata", () => {
			const classifySourceRef = exportedFunction<ClassifySourceRef>("classifySourceRef");
			const classified = classifySourceRef(
				`https://youtu.be/${youtubeId()}?feature=share&t=1h2m3s`,
			) as SourceClassification & { startSeconds?: number };

			expect(classified).toMatchObject({
				kind: "youtube",
				videoId: youtubeId(),
				startSeconds: 3723,
				canonicalUrl: `https://www.youtube.com/watch?v=${youtubeId()}`,
			});
		});

		it("prefers one valid start key and ignores ambiguous timestamp noise", () => {
			const classifySourceRef = exportedFunction<ClassifySourceRef>("classifySourceRef");
			expect(
				classifySourceRef(`https://youtube.com/watch?v=${youtubeId()}&start=75&t=30`),
			).toMatchObject({ startSeconds: 75 });
			expect(
				classifySourceRef(`https://youtube.com/watch?v=${youtubeId()}&t=30&t=40`),
			).not.toHaveProperty("startSeconds");
			expect(
				classifySourceRef(`https://youtube.com/watch?v=${youtubeId()}&start=bad&t=30`),
			).not.toHaveProperty("startSeconds");
		});
	});
});
