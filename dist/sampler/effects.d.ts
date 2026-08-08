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
import type { ResolutionTier, TranscriptSegment, TranscriptSource } from "../contract/index.js";
import type { FrameImage } from "./assemble.js";
export interface RunResult {
    stdout: Buffer;
    stderr: Buffer;
}
export interface ResolveSourceDeps {
    mkdtemp: (prefix: string) => Promise<string>;
    rm: (path: string, opts: {
        recursive: true;
        force: true;
    }) => Promise<void>;
    run: (bin: string, args: readonly string[], opts?: RunOptions) => Promise<RunResult>;
}
export interface CaptionFileEntry {
    name: string;
    isFile: () => boolean;
}
export interface CaptionFileStat {
    size: number;
}
export interface FetchTranscriptDeps {
    mkdtemp: (prefix: string) => Promise<string>;
    rm: (path: string, opts: {
        recursive: true;
        force: true;
    }) => Promise<void>;
    run: (bin: string, args: readonly string[], opts?: RunOptions) => Promise<RunResult>;
    readdir: (path: string) => Promise<CaptionFileEntry[]>;
    stat: (path: string) => Promise<CaptionFileStat>;
    readFile: (path: string, encoding: "utf8") => Promise<string>;
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
/** Normalize one of the deliberately supported YouTube URL forms. */
export declare function normalizeYouTubeUrl(ref: string): {
    videoId: string;
    canonicalUrl: string;
};
/** Classify a ref without changing borrowed local refs. */
export declare function classifySourceRef(ref: string): SourceClassification;
/** Resolve a local ref or download a supported YouTube ref into owned storage. */
export declare function resolveSource(ref: string, deps?: ResolveSourceDeps): Promise<ResolvedSource>;
/**
 * Parse the seconds value `ffprobe -show_entries format=duration` prints
 * (e.g. `"12.345\n"`) into integer milliseconds. Throws on missing / `N/A`.
 */
export declare function parseDurationMs(probeStdout: string): number;
/**
 * Extract scene-cut offsets from ffmpeg `showinfo` output. The scene filter +
 * `showinfo` print one `pts_time:<seconds>` per surviving frame on stderr.
 *
 * Returns ascending, de-duplicated integer millisecond offsets within
 * `[0, durationMs)`. `selectFrameTimes` re-normalizes too, but we hand it clean
 * data.
 */
export declare function parseSceneCutsMs(ffmpegOutput: string, durationMs: number): number[];
/** Parse WebVTT cues into stable, ordered caption segments without I/O. */
export declare function parseWebVtt(input: string): TranscriptSegment[];
/** Probe the total duration of `ref` in integer milliseconds (AC-1). */
export declare function probeDurationMs(ref: string): Promise<number>;
/**
 * Detect scene-change offsets (ms) in `ref` via ffmpeg's `scene` filter (AC-2).
 *
 * `select='gt(scene,<threshold>)',showinfo` keeps only frames where the scene
 * score jumps; `showinfo` prints their `pts_time` to stderr. We discard the
 * decoded output (`-f null -`).
 */
export declare function detectSceneCutsMs(ref: string, durationMs: number, threshold?: number): Promise<number[]>;
/**
 * Decode one PNG frame per requested time (AC-3).
 *
 * Returns `FrameImage[]` aligned 1:1 and in the same order as `timesMs`, each
 * with a non-empty base64 payload (no `data:` prefix). Seeks before input
 * (`-ss` before `-i`) for speed and decodes only the selected times (bounded by
 * the frame budget — PETE).
 */
export declare function decodeFramesAt(ref: string, timesMs: number[], resolution: ResolutionTier): Promise<FrameImage[]>;
/**
 * Fetch human YouTube captions with one automatic-caption fallback.
 *
 * This boundary is deliberately best-effort and never throws. Local refs,
 * unsupported URLs, missing captions, process/filesystem failures, malformed
 * WebVTT, and cleanup failures all degrade to `source: "none"` so visual tiers
 * remain reachable. Caption attempts are subtitle-only and never download media.
 */
export declare function fetchTranscript(ref: string, deps?: FetchTranscriptDeps): Promise<{
    segments: TranscriptSegment[];
    source: TranscriptSource | "none";
}>;
//# sourceMappingURL=effects.d.ts.map