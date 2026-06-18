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

interface RunResult {
	stdout: Buffer;
	stderr: Buffer;
}

interface RunOptions {
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
