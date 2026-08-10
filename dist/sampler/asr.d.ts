import type { TranscriptSegment } from "../contract/index.js";
import type { RunOptions, RunResult } from "./effects.js";
export declare const DEFAULT_LOCAL_ASR_EXECUTABLE = "mlx_whisper";
export declare const DEFAULT_LOCAL_ASR_MODEL = "mlx-community/whisper-tiny";
export declare const MAX_LOCAL_ASR_DURATION_MS = 600000;
export declare const DEFAULT_LOCAL_ASR_MAX_DURATION_MS = 600000;
export declare const MAX_LOCAL_ASR_TIMEOUT_MS = 600000;
export declare const DEFAULT_LOCAL_ASR_TIMEOUT_MS = 300000;
export declare const MAX_LOCAL_ASR_OUTPUT_BYTES: number;
export interface LocalAsrPolicy {
    executable: string;
    model: string;
    maxDurationMs: number;
    timeoutMs: number;
}
export type AsrDiagnostic = {
    reason: "duration-limit";
    durationMs: number;
    limitMs: number;
} | {
    reason: "missing-executable" | "timeout" | "process-error" | "invalid-output" | "cleanup-error";
};
export interface LocalAsrFileStat {
    size: number;
    isFile: () => boolean;
}
export interface LocalAsrDeps {
    mkdtemp: (prefix: string) => Promise<string>;
    run: (bin: string, args: readonly string[], opts: RunOptions) => Promise<RunResult>;
    stat: (path: string) => Promise<LocalAsrFileStat>;
    readFile: (path: string, encoding: "utf8") => Promise<string>;
    rm: (path: string, opts: {
        recursive: true;
        force: true;
    }) => Promise<void>;
}
export type LocalAsrResult = {
    segments: TranscriptSegment[];
    source: "whisper" | "none";
};
/** Convert parsed mlx-whisper JSON into validated shared-timeline segments. */
export declare function parseMlxWhisperJson(input: unknown, durationMs: number): TranscriptSegment[];
/** Run one bounded direct mlx-whisper process and read only its owned JSON output. */
export declare function fetchLocalAsrTranscript(mediaRef: string, durationMs: number, policy: LocalAsrPolicy, deps?: LocalAsrDeps, onDiagnostic?: (diagnostic: AsrDiagnostic) => void): Promise<LocalAsrResult>;
//# sourceMappingURL=asr.d.ts.map