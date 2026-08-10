import { execFile } from "node:child_process";
import { mkdtemp as fsMkdtemp, readFile as fsReadFile, rm as fsRm, stat as fsStat, } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
export const DEFAULT_LOCAL_ASR_EXECUTABLE = "mlx_whisper";
export const DEFAULT_LOCAL_ASR_MODEL = "mlx-community/whisper-tiny";
export const MAX_LOCAL_ASR_DURATION_MS = 600_000;
export const DEFAULT_LOCAL_ASR_MAX_DURATION_MS = MAX_LOCAL_ASR_DURATION_MS;
export const MAX_LOCAL_ASR_TIMEOUT_MS = 600_000;
export const DEFAULT_LOCAL_ASR_TIMEOUT_MS = 300_000;
export const MAX_LOCAL_ASR_OUTPUT_BYTES = 16 * 1024 * 1024;
const execFileAsync = promisify(execFile);
const DEFAULT_LOCAL_ASR_DEPS = {
    mkdtemp: fsMkdtemp,
    run: async (bin, args, opts) => {
        const { stdout, stderr } = await execFileAsync(bin, args, {
            timeout: opts.timeoutMs,
            maxBuffer: opts.maxBuffer,
            encoding: "buffer",
        });
        return { stdout, stderr };
    },
    stat: async (path) => fsStat(path),
    readFile: async (path, encoding) => fsReadFile(path, encoding),
    rm: async (path, opts) => fsRm(path, opts),
};
const NONE = { segments: [], source: "none" };
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** Convert parsed mlx-whisper JSON into validated shared-timeline segments. */
export function parseMlxWhisperJson(input, durationMs) {
    if (!isRecord(input) || !Array.isArray(input.segments))
        return [];
    if (!Number.isFinite(durationMs) || durationMs < 0)
        return [];
    const parsed = [];
    for (const [order, candidate] of input.segments.entries()) {
        if (!isRecord(candidate))
            continue;
        const { start, end, text } = candidate;
        if (typeof start !== "number" ||
            typeof end !== "number" ||
            !Number.isFinite(start) ||
            !Number.isFinite(end) ||
            start < 0 ||
            end < start ||
            start * 1000 >= durationMs ||
            typeof text !== "string" ||
            text.trim() === "") {
            continue;
        }
        const startMs = Math.round(start * 1000);
        const endMs = Math.min(durationMs, Math.round(end * 1000));
        if (endMs < startMs)
            continue;
        parsed.push({ startMs, endMs, text: text.trim(), source: "whisper", order });
    }
    return parsed
        .sort((a, b) => a.startMs - b.startMs || a.order - b.order)
        .map(({ order: _order, ...segment }) => segment);
}
function emitDiagnostic(onDiagnostic, diagnostic) {
    try {
        onDiagnostic?.(diagnostic);
    }
    catch {
        /* diagnostics are a best-effort side channel */
    }
}
function classifyProcessFailure(error) {
    const failure = isRecord(error) ? error : {};
    if (failure.code === "ENOENT")
        return { reason: "missing-executable" };
    if (failure.killed || failure.signal === "SIGTERM" || failure.signal === "SIGKILL") {
        return { reason: "timeout" };
    }
    return { reason: "process-error" };
}
/** Run one bounded direct mlx-whisper process and read only its owned JSON output. */
export async function fetchLocalAsrTranscript(mediaRef, durationMs, policy, deps = DEFAULT_LOCAL_ASR_DEPS, onDiagnostic) {
    if (durationMs > policy.maxDurationMs) {
        emitDiagnostic(onDiagnostic, {
            reason: "duration-limit",
            durationMs,
            limitMs: policy.maxDurationMs,
        });
        return NONE;
    }
    let outputDir;
    try {
        outputDir = await deps.mkdtemp(join(tmpdir(), "pi-watch-asr-"));
    }
    catch {
        emitDiagnostic(onDiagnostic, { reason: "invalid-output" });
        return NONE;
    }
    let result = NONE;
    let stage = "process";
    try {
        await deps.run(policy.executable, [
            mediaRef,
            "--model",
            policy.model,
            "--language",
            "en",
            "--task",
            "transcribe",
            "--output-name",
            "transcript",
            "--output-format",
            "json",
            "--verbose",
            "False",
            "--output-dir",
            outputDir,
        ], { timeoutMs: policy.timeoutMs, maxBuffer: MAX_LOCAL_ASR_OUTPUT_BYTES });
        stage = "output";
        const outputPath = join(outputDir, "transcript.json");
        const outputStat = await deps.stat(outputPath);
        if (!outputStat.isFile() || outputStat.size > MAX_LOCAL_ASR_OUTPUT_BYTES) {
            throw new Error("invalid ASR output file");
        }
        const raw = await deps.readFile(outputPath, "utf8");
        if (Buffer.byteLength(raw, "utf8") > MAX_LOCAL_ASR_OUTPUT_BYTES) {
            throw new Error("ASR output exceeded its read bound");
        }
        const segments = parseMlxWhisperJson(JSON.parse(raw), durationMs);
        if (segments.length === 0)
            throw new Error("ASR output contained no valid segments");
        result = { segments, source: "whisper" };
    }
    catch (error) {
        emitDiagnostic(onDiagnostic, stage === "process" ? classifyProcessFailure(error) : { reason: "invalid-output" });
        result = NONE;
    }
    finally {
        try {
            await deps.rm(outputDir, { recursive: true, force: true });
        }
        catch {
            emitDiagnostic(onDiagnostic, { reason: "cleanup-error" });
            result = NONE;
        }
    }
    return result;
}
//# sourceMappingURL=asr.js.map