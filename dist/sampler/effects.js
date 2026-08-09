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
 * Local-first: local refs remain network-free, while supported YouTube refs use
 * the system `yt-dlp` for owned media/caption effects. No cloud API, provider key,
 * or `whisper` install is required; transcript fetch stays best-effort.
 *
 * Security: `ref` is caller-supplied and flows straight into argv. We ALWAYS
 * spawn via `execFile` with an argument array — never a shell string, never
 * `exec`, never `shell: true` — so a hostile `ref` cannot inject a command.
 */
import { execFile } from "node:child_process";
import { mkdtemp as fsMkdtemp, readFile as fsReadFile, readdir as fsReaddir, rm as fsRm, stat as fsStat, } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
/** Default per-spawn timeout. External tools must never hang the sampler. */
const DEFAULT_TIMEOUT_MS = 60_000;
/** Scene analysis is intentionally bounded independently of the per-process timeout. */
const MAX_SCENE_DETECTION_DURATION_MS = 10 * 60_000;
/** Generous capture ceiling — a low-res PNG frame is well under this. */
const DEFAULT_MAX_BUFFER = 64 * 1024 * 1024;
/** Default longest-side cap for "low" resolution frames (DESIGN §3). */
const LOW_RES_MAX_DIM = 512;
/** Maximum UTF-8 WebVTT file size read into memory. */
const MAX_CAPTION_FILE_BYTES = 16 * 1024 * 1024;
/** A typed timeout from a bounded external-process invocation. */
export class ProcessTimeoutError extends Error {
    bin;
    timeoutMs;
    constructor(bin, timeoutMs) {
        super(`${bin} timed out after ${timeoutMs}ms.`);
        this.name = "ProcessTimeoutError";
        this.bin = bin;
        this.timeoutMs = timeoutMs;
    }
}
function asExecError(err) {
    return typeof err === "object" && err !== null ? err : {};
}
function stderrText(e) {
    if (e.stderr == null)
        return "";
    return typeof e.stderr === "string" ? e.stderr : e.stderr.toString("utf8");
}
/**
 * Run a binary safely, capturing stdout/stderr as Buffers.
 *
 * Throws a contextual `Error` naming the binary on missing executable
 * (`ENOENT`), timeout, or non-zero exit, so callers fail loudly instead of
 * silently producing garbage.
 */
async function run(bin, args, opts = {}) {
    try {
        const { stdout, stderr } = await execFileAsync(bin, args, {
            timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
            maxBuffer: opts.maxBuffer ?? DEFAULT_MAX_BUFFER,
            encoding: "buffer",
        });
        return { stdout, stderr };
    }
    catch (err) {
        const e = asExecError(err);
        if (e.code === "ENOENT") {
            throw new Error(`${bin} not found on PATH. Install it (e.g. \`brew install ${bin}\`) to use the sampler.`);
        }
        if (e.killed) {
            throw new ProcessTimeoutError(bin, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
        }
        const tail = stderrText(e).split("\n").slice(-5).join("\n").trim();
        throw new Error(`${bin} exited with ${String(e.code ?? "unknown")}.${tail ? ` stderr: ${tail}` : ""}`);
    }
}
const DEFAULT_RESOLVE_SOURCE_DEPS = {
    mkdtemp: fsMkdtemp,
    rm: async (path, opts) => fsRm(path, opts),
    run,
};
const DEFAULT_FETCH_TRANSCRIPT_DEPS = {
    mkdtemp: fsMkdtemp,
    rm: async (path, opts) => fsRm(path, opts),
    run,
    readdir: async (path) => fsReaddir(path, { withFileTypes: true }),
    stat: async (path) => fsStat(path),
    readFile: async (path, encoding) => fsReadFile(path, encoding),
};
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
function sourceUrlError(detail) {
    return new Error(`Unsupported YouTube source URL: ${detail}.`);
}
/** Normalize one of the deliberately supported YouTube URL forms. */
export function normalizeYouTubeUrl(ref) {
    const candidate = ref.trim();
    if (!/^https?:\/\//i.test(candidate)) {
        throw sourceUrlError("expected an http(s) URL");
    }
    let url;
    try {
        url = new URL(candidate);
    }
    catch {
        throw sourceUrlError("the URL is malformed");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw sourceUrlError("expected an http(s) URL");
    }
    if (url.username || url.password || url.port) {
        throw sourceUrlError("the URL authority is unsupported");
    }
    const host = url.hostname.toLowerCase();
    let videoId = null;
    if (host === "youtube.com" || host === "www.youtube.com") {
        if (url.pathname === "/watch") {
            const values = url.searchParams.getAll("v");
            videoId = values.length === 1 ? values[0] ?? null : null;
        }
        else if (url.pathname.startsWith("/shorts/")) {
            const parts = url.pathname.split("/");
            videoId = parts.length === 3 && parts[1] === "shorts" ? parts[2] ?? null : null;
        }
    }
    else if (host === "youtu.be") {
        const parts = url.pathname.split("/");
        videoId = parts.length === 2 ? parts[1] ?? null : null;
    }
    else {
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
export function classifySourceRef(ref) {
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
function downloadError(err) {
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
        return new Error(`yt-dlp exited with ${String(e.code)}.${tail ? ` stderr: ${tail}` : ` ${message}`}`);
    }
    return new Error(`yt-dlp download failed: ${message}`);
}
function parseDownloadedPath(stdout, ownedDir) {
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
    const mediaRef = resolve(lines[0]);
    const ownedRoot = resolve(ownedDir);
    const within = relative(ownedRoot, mediaRef);
    if (within === "" || within === ".." || within.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || /^(?:[A-Za-z]:[\\/]|[\\/])/.test(within)) {
        throw new Error(`yt-dlp output is outside the owned temporary directory: ${lines[0]}`);
    }
    return mediaRef;
}
/** Resolve a local ref or download a supported YouTube ref into owned storage. */
export async function resolveSource(ref, deps = DEFAULT_RESOLVE_SOURCE_DEPS) {
    const classification = classifySourceRef(ref);
    if (classification.kind === "local") {
        return {
            originalRef: ref,
            mediaRef: ref,
            ownership: "caller",
            cleanup: async () => undefined,
        };
    }
    let tempDir;
    try {
        tempDir = await deps.mkdtemp(join(tmpdir(), "pi-watch-youtube-"));
    }
    catch (err) {
        throw new Error(`yt-dlp temporary directory setup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    let cleanupPromise;
    const cleanup = () => {
        cleanupPromise ??= deps.rm(tempDir, { recursive: true, force: true });
        return cleanupPromise;
    };
    try {
        const output = await deps.run("yt-dlp", [
            "--ignore-config",
            "--no-playlist",
            "--print",
            "after_move:filepath",
            "-o",
            join(tempDir, "%(id)s.%(ext)s"),
            classification.canonicalUrl,
        ], { timeoutMs: DEFAULT_TIMEOUT_MS, maxBuffer: DEFAULT_MAX_BUFFER });
        const mediaRef = parseDownloadedPath(output.stdout, tempDir);
        return {
            originalRef: ref,
            mediaRef,
            ownership: "sampler-temporary",
            cleanup,
        };
    }
    catch (err) {
        const primaryError = err instanceof Error && /yt-dlp (?:produced|output)/i.test(err.message)
            ? err
            : downloadError(err);
        try {
            await cleanup();
        }
        catch (cleanupErr) {
            const cleanupError = cleanupErr instanceof Error ? cleanupErr : new Error(String(cleanupErr));
            throw new AggregateError([primaryError, cleanupError], `${primaryError.message} Temporary source cleanup also failed: ${cleanupError.message}`);
        }
        throw primaryError;
    }
}
// ── Pure parsers (no I/O — exported for direct unit tests) ───────────────────
/**
 * Parse the seconds value `ffprobe -show_entries format=duration` prints
 * (e.g. `"12.345\n"`) into integer milliseconds. Throws on missing / `N/A`.
 */
export function parseDurationMs(probeStdout) {
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
export function parseSceneCutsMs(ffmpegOutput, durationMs) {
    const out = new Set();
    const re = /pts_time:([0-9]+(?:\.[0-9]+)?)/g;
    let m;
    while ((m = re.exec(ffmpegOutput)) !== null) {
        const seconds = Number.parseFloat(m[1]);
        if (!Number.isFinite(seconds))
            continue;
        const ms = Math.round(seconds * 1000);
        if (ms >= 0 && ms < durationMs)
            out.add(ms);
    }
    return Array.from(out).sort((a, b) => a - b);
}
function parseWebVttTimestamp(value) {
    const match = /^(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{3})$/.exec(value);
    if (!match)
        return null;
    const hours = match[1] === undefined ? 0 : Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2], 10);
    const seconds = Number.parseInt(match[3], 10);
    const milliseconds = Number.parseInt(match[4], 10);
    if (minutes >= 60 || seconds >= 60)
        return null;
    return ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds;
}
function parseWebVttTiming(line) {
    const match = /^(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/.exec(line.trim());
    if (!match)
        return null;
    const startMs = parseWebVttTimestamp(match[1]);
    const endMs = parseWebVttTimestamp(match[2]);
    if (startMs === null || endMs === null || endMs < startMs)
        return null;
    return { startMs, endMs };
}
const WEBVTT_CHARACTER_REFERENCES = {
    amp: "&",
    lt: "<",
    gt: ">",
    nbsp: "\u00a0",
    lrm: "\u200e",
    rlm: "\u200f",
};
function stripWebVttMarkup(line) {
    return line
        .replace(/<(?:\d+:)?\d{2}:\d{2}[.,]\d{3}>/g, "")
        .replace(/<[^>]*>/g, "")
        .replace(/&(amp|lt|gt|nbsp|lrm|rlm);/g, (_match, name) => WEBVTT_CHARACTER_REFERENCES[name] ?? _match)
        .trim();
}
/** Parse WebVTT cues into stable, ordered caption segments without I/O. */
export function parseWebVtt(input) {
    const lines = input.replace(/\r\n?/g, "\n").split("\n");
    const parsed = [];
    let cueOrder = 0;
    for (let i = 0; i < lines.length;) {
        const line = lines[i].trim();
        if (line === "" || (i === 0 && line.startsWith("WEBVTT"))) {
            i += 1;
            continue;
        }
        if (/^(?:NOTE|STYLE|REGION)(?:\s|$)/.test(line)) {
            while (i < lines.length && lines[i].trim() !== "")
                i += 1;
            continue;
        }
        let timingIndex = i;
        if (!line.includes("-->"))
            timingIndex += 1;
        const timingLine = lines[timingIndex]?.trim() ?? "";
        const timing = parseWebVttTiming(timingLine);
        if (!timing) {
            while (i < lines.length && lines[i].trim() !== "")
                i += 1;
            continue;
        }
        i = timingIndex + 1;
        const payload = [];
        while (i < lines.length && lines[i].trim() !== "") {
            const text = stripWebVttMarkup(lines[i]);
            if (text !== "")
                payload.push(text);
            i += 1;
        }
        if (payload.length > 0) {
            parsed.push({
                ...timing,
                text: payload.join("\n"),
                source: "captions",
                order: cueOrder,
            });
            cueOrder += 1;
        }
    }
    return parsed
        .sort((a, b) => a.startMs - b.startMs || a.order - b.order)
        .map(({ order: _order, ...segment }) => segment);
}
// ── Effects (thin wrappers over `run` + a parser) ────────────────────────────
/** Probe the total duration of `ref` in integer milliseconds (AC-1). */
export async function probeDurationMs(ref) {
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
 * `fps=2,scale=320:-2,select='gt(scene,<threshold>)',showinfo` keeps only
 * reduced-rate, reduced-resolution frames where the scene score jumps;
 * `showinfo` prints their `pts_time` to stderr. We discard the decoded output
 * (`-f null -`). Scene analysis is skipped for clips longer than ten minutes.
 */
export async function detectSceneCutsMs(ref, durationMs, threshold = 0.4, options) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const emit = (diagnostic) => {
        try {
            options?.onDiagnostic?.(diagnostic);
        }
        catch {
            /* diagnostics are a best-effort side channel */
        }
    };
    if (durationMs > MAX_SCENE_DETECTION_DURATION_MS) {
        emit({
            reason: "duration-skip",
            durationMs,
            limitMs: MAX_SCENE_DETECTION_DURATION_MS,
        });
        return [];
    }
    const sceneFilter = `fps=2,scale=320:-2,select='gt(scene,${threshold})',showinfo`;
    try {
        const { stderr } = await (options?.run ?? run)("ffmpeg", [
            "-nostdin",
            "-i",
            ref,
            "-vf",
            sceneFilter,
            "-f",
            "null",
            "-",
        ], { timeoutMs, maxBuffer: DEFAULT_MAX_BUFFER });
        return parseSceneCutsMs(stderr.toString("utf8"), durationMs);
    }
    catch (err) {
        if (err instanceof ProcessTimeoutError) {
            emit({ reason: "timeout-fallback", timeoutMs });
            return [];
        }
        throw err;
    }
}
/**
 * Decode one PNG frame per requested time (AC-3).
 *
 * Returns `FrameImage[]` aligned 1:1 and in the same order as `timesMs`, each
 * with a non-empty base64 payload (no `data:` prefix). Seeks before input
 * (`-ss` before `-i`) for speed and decodes only the selected times (bounded by
 * the frame budget — PETE).
 */
export async function decodeFramesAt(ref, timesMs, resolution) {
    const mediaType = "image/png";
    const frames = [];
    for (const tMs of timesMs) {
        const seconds = (tMs / 1000).toFixed(3);
        const args = ["-nostdin", "-loglevel", "error", "-ss", seconds, "-i", ref, "-frames:v", "1"];
        if (resolution === "low") {
            args.push("-vf", `scale=${LOW_RES_MAX_DIM}:${LOW_RES_MAX_DIM}:force_original_aspect_ratio=decrease`);
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
function captionArgs(tempDir, canonicalUrl, automatic) {
    return [
        "--ignore-config",
        "--no-playlist",
        "--skip-download",
        automatic ? "--write-auto-subs" : "--write-subs",
        "--sub-format",
        "vtt",
        "-o",
        join(tempDir, `${automatic ? "auto" : "human"}.%(id)s.%(language)s.%(ext)s`),
        canonicalUrl,
    ];
}
async function readCaptionCandidates(tempDir, deps) {
    const entries = await deps.readdir(tempDir);
    const candidates = entries
        .filter((entry) => entry.isFile() &&
        entry.name === basename(entry.name) &&
        entry.name.toLowerCase().endsWith(".vtt"))
        .map((entry) => entry.name)
        .sort();
    for (const name of candidates) {
        const path = join(tempDir, name);
        const { size } = await deps.stat(path);
        if (size > MAX_CAPTION_FILE_BYTES)
            continue;
        const segments = parseWebVtt(await deps.readFile(path, "utf8"));
        if (segments.length > 0)
            return segments;
    }
    return [];
}
async function fetchCaptionAttempt(tempDir, canonicalUrl, automatic, deps) {
    await deps.run("yt-dlp", captionArgs(tempDir, canonicalUrl, automatic), {
        timeoutMs: DEFAULT_TIMEOUT_MS,
        maxBuffer: DEFAULT_MAX_BUFFER,
    });
    return readCaptionCandidates(tempDir, deps);
}
/**
 * Fetch human YouTube captions with one automatic-caption fallback.
 *
 * This boundary is deliberately best-effort and never throws. Local refs,
 * unsupported URLs, missing captions, process/filesystem failures, malformed
 * WebVTT, and cleanup failures all degrade to `source: "none"` so visual tiers
 * remain reachable. Caption attempts are subtitle-only and never download media.
 */
export async function fetchTranscript(ref, deps = DEFAULT_FETCH_TRANSCRIPT_DEPS) {
    const none = { segments: [], source: "none" };
    let classification;
    try {
        classification = classifySourceRef(ref);
    }
    catch {
        return none;
    }
    if (classification.kind === "local")
        return none;
    let tempDir;
    let result = none;
    try {
        tempDir = await deps.mkdtemp(join(tmpdir(), "pi-watch-caption-"));
        let segments = await fetchCaptionAttempt(tempDir, classification.canonicalUrl, false, deps);
        if (segments.length === 0) {
            segments = await fetchCaptionAttempt(tempDir, classification.canonicalUrl, true, deps);
        }
        if (segments.length > 0)
            result = { segments, source: "captions" };
    }
    catch {
        result = none;
    }
    finally {
        if (tempDir !== undefined) {
            try {
                await deps.rm(tempDir, { recursive: true, force: true });
            }
            catch {
                result = none;
            }
        }
    }
    return result;
}
//# sourceMappingURL=effects.js.map