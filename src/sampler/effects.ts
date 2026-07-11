/**
 * effects.ts — the sampler's explicit effect boundary (DESIGN.md §3).
 *
 * This is where the sampler stops being pure arithmetic and starts touching the
 * real world: it shells out to `ffprobe` (duration), `ffmpeg` (scene-change
 * detection + frame decode), and a best-effort transcript source. Every side
 * effect (process spawn, base64 read) is isolated here so the decision/assembly
 * core (select-frames.ts / assemble.ts) stays pure (AGENTS.md "Pure Core,
 * Explicit Effects").
 *
 * Local-first: it uses the system `ffmpeg`/`ffprobe`/`yt-dlp` and never requires
 * a cloud service, a `whisper` install, or network access. Transcript fetch is
 * best-effort and degrades to "none".
 *
 * Security: `ref` is caller-supplied and flows straight into argv. We ALWAYS
 * spawn via `execFile` with an argument array — never a shell string, never
 * `exec`, never `shell: true` — so a hostile `ref` cannot inject a command.
 */

import { execFile } from "node:child_process";
import { mkdtemp as fsMkdtemp, rm as fsRm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import type {
	MediaType,
	ResolutionTier,
	TranscriptSegment,
	TranscriptSource,
} from "../contract/index.js";
import type { FrameImage } from "./assemble.js";

const execFileAsync = promisify(execFile);

/** Default per-spawn timeout. External tools must never hang the sampler. */
const DEFAULT_TIMEOUT_MS = 60_000;
/** Generous capture ceiling — a low-res PNG frame is well under this. */
const DEFAULT_MAX_BUFFER = 64 * 1024 * 1024;
/** Default longest-side cap for "low" resolution frames (DESIGN §3). */
const LOW_RES_MAX_DIM = 512;

export interface RunResult {
	stdout: Buffer;
	stderr: Buffer;
}

export interface ResolveSourceDeps {
	mkdtemp: (prefix: string) => Promise<string>;
	rm: (path: string, opts: { recursive: true; force: true }) => Promise<void>;
	run: (bin: string, args: readonly string[], opts?: RunOptions) => Promise<RunResult>;
}

export interface ResolvedSource {
	originalRef: string;
	mediaRef: string;
	ownership: "caller" | "sampler-temporary";
	cleanup: () => Promise<void>;
}

export interface RunOptions {
	timeoutMs?: number;
	maxBuffer?: number;
}

/** Shape of the error `execFile` rejects with (narrowed from `unknown`). */
interface ExecError {
	code?: string | number;
	killed?: boolean;
	signal?: NodeJS.Signals | null;
	stderr?: Buffer | string;
}

function asExecError(err: unknown): ExecError {
	return typeof err === "object" && err !== null ? (err as ExecError) : {};
}

function stderrText(e: ExecError): string {
	if (e.stderr == null) return "";
	return typeof e.stderr === "string" ? e.stderr : e.stderr.toString("utf8");
}

/**
 * Run a binary safely, capturing stdout/stderr as Buffers.
 *
 * Throws a contextual `Error` naming the binary on missing executable
 * (`ENOENT`), timeout, or non-zero exit, so callers fail loudly instead of
 * silently producing garbage.
 */
async function run(
	bin: string,
	args: readonly string[],
	opts: RunOptions = {},
): Promise<RunResult> {
	try {
		const { stdout, stderr } = await execFileAsync(bin, args as string[], {
			timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
			maxBuffer: opts.maxBuffer ?? DEFAULT_MAX_BUFFER,
			encoding: "buffer",
		});
		return { stdout, stderr };
	} catch (err) {
		const e = asExecError(err);
		if (e.code === "ENOENT") {
			throw new Error(
				`${bin} not found on PATH. Install it (e.g. \`brew install ${bin}\`) to use the sampler.`,
			);
		}
		if (e.killed) {
			throw new Error(`${bin} timed out after ${opts.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms.`);
		}
		const tail = stderrText(e).split("\n").slice(-5).join("\n").trim();
		throw new Error(
			`${bin} exited with ${String(e.code ?? "unknown")}.${tail ? ` stderr: ${tail}` : ""}`,
		);
	}
}

export interface YouTubeSource {
	kind: "youtube";
	originalRef: string;
	videoId: string;
	canonicalUrl: string;
}

export interface LocalSource {
	kind: "local";
	originalRef: string;
	mediaRef: string;
}

export type SourceClassification = YouTubeSource | LocalSource;

const DEFAULT_RESOLVE_SOURCE_DEPS: ResolveSourceDeps = {
	mkdtemp: fsMkdtemp,
	rm: async (path, opts) => fsRm(path, opts),
	run,
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function sourceUrlError(detail: string): Error {
	return new Error(`Unsupported YouTube source URL: ${detail}.`);
}

/** Normalize one of the deliberately supported YouTube URL forms. */
export function normalizeYouTubeUrl(ref: string): { videoId: string; canonicalUrl: string } {
	const candidate = ref.trim();
	if (!/^https?:\/\//i.test(candidate)) {
		throw sourceUrlError("expected an http(s) URL");
	}

	let url: URL;
	try {
		url = new URL(candidate);
	} catch {
		throw sourceUrlError("the URL is malformed");
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw sourceUrlError("expected an http(s) URL");
	}
	if (url.username || url.password || url.port) {
		throw sourceUrlError("the URL authority is unsupported");
	}

	const host = url.hostname.toLowerCase();
	let videoId: string | null = null;
	if (host === "youtube.com" || host === "www.youtube.com") {
		if (url.pathname === "/watch") {
			const values = url.searchParams.getAll("v");
			videoId = values.length === 1 ? values[0] ?? null : null;
		} else if (url.pathname.startsWith("/shorts/")) {
			const parts = url.pathname.split("/");
			videoId = parts.length === 3 && parts[1] === "shorts" ? parts[2] ?? null : null;
		}
	} else if (host === "youtu.be") {
		const parts = url.pathname.split("/");
		videoId = parts.length === 2 ? parts[1] ?? null : null;
	} else {
		throw sourceUrlError(`host ${JSON.stringify(url.hostname)} is not supported`);
	}

	if (!videoId || !YOUTUBE_ID.test(videoId)) {
		throw sourceUrlError("the video ID must be exactly 11 valid characters");
	}
	return {
		videoId,
		canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
	};
}

/** Classify a ref without changing borrowed local refs. */
export function classifySourceRef(ref: string): SourceClassification {
	if (/^\s*https?:/i.test(ref)) {
		const normalized = normalizeYouTubeUrl(ref);
		return {
			kind: "youtube",
			originalRef: ref,
			...normalized,
		};
	}
	return { kind: "local", originalRef: ref, mediaRef: ref };
}

function downloadError(err: unknown): Error {
	const e = asExecError(err);
	const message = err instanceof Error ? err.message : String(err);
	if (e.code === "ENOENT" || /(?:spawn|yt-dlp).*(?:ENOENT|not found)/i.test(message)) {
		return new Error("yt-dlp not found on PATH. Install it to resolve YouTube sources.");
	}
	if (e.killed || /timed out|timeout/i.test(message)) {
		return new Error(`yt-dlp timed out while downloading the source: ${message}`);
	}
	if (e.code !== undefined && e.code !== 0) {
		const tail = stderrText(e).split("\n").slice(-5).join("\n").trim();
		return new Error(
			`yt-dlp exited with ${String(e.code)}.${tail ? ` stderr: ${tail}` : ` ${message}`}`,
		);
	}
	return new Error(`yt-dlp download failed: ${message}`);
}

function parseDownloadedPath(stdout: Buffer, ownedDir: string): string {
	const lines = stdout
		.toString("utf8")
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	if (lines.length === 0) {
		throw new Error("yt-dlp produced no downloaded file output");
	}
	if (lines.length !== 1) {
		throw new Error(`yt-dlp produced ambiguous output (${lines.length} paths)`);
	}

	const mediaRef = resolve(lines[0]!);
	const ownedRoot = resolve(ownedDir);
	const within = relative(ownedRoot, mediaRef);
	if (within === "" || within === ".." || within.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || /^(?:[A-Za-z]:[\\/]|[\\/])/.test(within)) {
		throw new Error(`yt-dlp output is outside the owned temporary directory: ${lines[0]}`);
	}
	return mediaRef;
}

/** Resolve a local ref or download a supported YouTube ref into owned storage. */
export async function resolveSource(
	ref: string,
	deps: ResolveSourceDeps = DEFAULT_RESOLVE_SOURCE_DEPS,
): Promise<ResolvedSource> {
	const classification = classifySourceRef(ref);
	if (classification.kind === "local") {
		return {
			originalRef: ref,
			mediaRef: ref,
			ownership: "caller",
			cleanup: async () => undefined,
		};
	}

	let tempDir: string;
	try {
		tempDir = await deps.mkdtemp(join(tmpdir(), "pi-watch-youtube-"));
	} catch (err) {
		throw new Error(`yt-dlp temporary directory setup failed: ${err instanceof Error ? err.message : String(err)}`);
	}

	let cleanupPromise: Promise<void> | undefined;
	const cleanup = (): Promise<void> => {
		cleanupPromise ??= deps.rm(tempDir, { recursive: true, force: true });
		return cleanupPromise;
	};

	try {
		const output = await deps.run(
			"yt-dlp",
			[
				"--ignore-config",
				"--no-playlist",
				"--print",
				"after_move:filepath",
				"-o",
				join(tempDir, "%(id)s.%(ext)s"),
				classification.canonicalUrl,
			],
			{ timeoutMs: DEFAULT_TIMEOUT_MS, maxBuffer: DEFAULT_MAX_BUFFER },
		);
		const mediaRef = parseDownloadedPath(output.stdout, tempDir);
		return {
			originalRef: ref,
			mediaRef,
			ownership: "sampler-temporary",
			cleanup,
		};
	} catch (err) {
		const primaryError =
			err instanceof Error && /yt-dlp (?:produced|output)/i.test(err.message)
				? err
				: downloadError(err);
		try {
			await cleanup();
		} catch (cleanupErr) {
			const cleanupError =
				cleanupErr instanceof Error ? cleanupErr : new Error(String(cleanupErr));
			throw new AggregateError(
				[primaryError, cleanupError],
				`${primaryError.message} Temporary source cleanup also failed: ${cleanupError.message}`,
			);
		}
		throw primaryError;
}
}

// ── Pure parsers (no I/O — exported for direct unit tests) ───────────────────

/**
 * Parse the seconds value `ffprobe -show_entries format=duration` prints
 * (e.g. `"12.345\n"`) into integer milliseconds. Throws on missing / `N/A`.
 */
export function parseDurationMs(probeStdout: string): number {
	const raw = probeStdout.trim();
	if (raw === "" || raw.toUpperCase() === "N/A") {
		throw new Error(`ffprobe returned no duration (got ${JSON.stringify(probeStdout)}).`);
	}
	const seconds = Number.parseFloat(raw);
	if (!Number.isFinite(seconds) || seconds < 0) {
		throw new Error(`ffprobe returned an unparseable duration: ${JSON.stringify(probeStdout)}.`);
	}
	return Math.round(seconds * 1000);
}

/**
 * Extract scene-cut offsets from ffmpeg `showinfo` output. The scene filter +
 * `showinfo` print one `pts_time:<seconds>` per surviving frame on stderr.
 *
 * Returns ascending, de-duplicated integer millisecond offsets within
 * `[0, durationMs)`. `selectFrameTimes` re-normalizes too, but we hand it clean
 * data.
 */
export function parseSceneCutsMs(ffmpegOutput: string, durationMs: number): number[] {
	const out = new Set<number>();
	const re = /pts_time:([0-9]+(?:\.[0-9]+)?)/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(ffmpegOutput)) !== null) {
		const seconds = Number.parseFloat(m[1]!);
		if (!Number.isFinite(seconds)) continue;
		const ms = Math.round(seconds * 1000);
		if (ms >= 0 && ms < durationMs) out.add(ms);
	}
	return Array.from(out).sort((a, b) => a - b);
}

// ── Effects (thin wrappers over `run` + a parser) ────────────────────────────

/** Probe the total duration of `ref` in integer milliseconds (AC-1). */
export async function probeDurationMs(ref: string): Promise<number> {
	const { stdout } = await run("ffprobe", [
		"-v",
		"error",
		"-show_entries",
		"format=duration",
		"-of",
		"default=noprint_wrappers=1:nokey=1",
		ref,
	]);
	return parseDurationMs(stdout.toString("utf8"));
}

/**
 * Detect scene-change offsets (ms) in `ref` via ffmpeg's `scene` filter (AC-2).
 *
 * `select='gt(scene,<threshold>)',showinfo` keeps only frames where the scene
 * score jumps; `showinfo` prints their `pts_time` to stderr. We discard the
 * decoded output (`-f null -`).
 */
export async function detectSceneCutsMs(
	ref: string,
	durationMs: number,
	threshold = 0.4,
): Promise<number[]> {
	const { stderr } = await run("ffmpeg", [
		"-nostdin",
		"-i",
		ref,
		"-vf",
		`select='gt(scene,${threshold})',showinfo`,
		"-f",
		"null",
		"-",
	]);
	return parseSceneCutsMs(stderr.toString("utf8"), durationMs);
}

/**
 * Decode one PNG frame per requested time (AC-3).
 *
 * Returns `FrameImage[]` aligned 1:1 and in the same order as `timesMs`, each
 * with a non-empty base64 payload (no `data:` prefix). Seeks before input
 * (`-ss` before `-i`) for speed and decodes only the selected times (bounded by
 * the frame budget — PETE).
 */
export async function decodeFramesAt(
	ref: string,
	timesMs: number[],
	resolution: ResolutionTier,
): Promise<FrameImage[]> {
	const mediaType: MediaType = "image/png";
	const frames: FrameImage[] = [];
	for (const tMs of timesMs) {
		const seconds = (tMs / 1000).toFixed(3);
		const args = ["-nostdin", "-loglevel", "error", "-ss", seconds, "-i", ref, "-frames:v", "1"];
		if (resolution === "low") {
			args.push(
				"-vf",
				`scale=${LOW_RES_MAX_DIM}:${LOW_RES_MAX_DIM}:force_original_aspect_ratio=decrease`,
			);
		}
		args.push("-vcodec", "png", "-f", "image2pipe", "-");
		const { stdout } = await run("ffmpeg", args);
		if (stdout.length === 0) {
			throw new Error(`ffmpeg produced no frame at ${seconds}s for ${ref}.`);
		}
		frames.push({ imageBase64: stdout.toString("base64"), mediaType });
	}
	return frames;
}

/**
 * Best-effort transcript fetch (AC-5).
 *
 * Local-first and never-throwing: returns `{ segments: [], source: "none" }`
 * unless a transcript is genuinely available. Real caption (yt-dlp) / Whisper
 * parsing is a deferred extension point — a clean "none" fallback is a complete,
 * accepted implementation for this phase. This function MUST NOT throw, require
 * a `whisper` install, or require network access.
 */
export async function fetchTranscript(
	ref: string,
): Promise<{ segments: TranscriptSegment[]; source: TranscriptSource | "none" }> {
	const none = { segments: [] as TranscriptSegment[], source: "none" as const };
	try {
		const isUrl = /^https?:\/\//i.test(ref.trim());
		if (!isUrl) {
			// Local file: no embedded captions; Whisper transcription is deferred.
			return none;
		}
		// URL: caption download/parse (yt-dlp) is a deferred extension point.
		// Until implemented, degrade to "none" rather than risk a network hang.
		return none;
	} catch {
		return none;
	}
}
