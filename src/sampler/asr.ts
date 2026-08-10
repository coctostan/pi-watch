import { execFile } from "node:child_process";
import {
	mkdtemp as fsMkdtemp,
	readFile as fsReadFile,
	rm as fsRm,
	stat as fsStat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { TranscriptSegment } from "../contract/index.js";
import type { RunOptions, RunResult } from "./effects.js";

export const DEFAULT_LOCAL_ASR_EXECUTABLE = "mlx_whisper";
export const DEFAULT_LOCAL_ASR_MODEL = "mlx-community/whisper-tiny";
export const MAX_LOCAL_ASR_DURATION_MS = 600_000;
export const DEFAULT_LOCAL_ASR_MAX_DURATION_MS = MAX_LOCAL_ASR_DURATION_MS;
export const MAX_LOCAL_ASR_TIMEOUT_MS = 600_000;
export const DEFAULT_LOCAL_ASR_TIMEOUT_MS = 300_000;
export const MAX_LOCAL_ASR_OUTPUT_BYTES = 16 * 1024 * 1024;

export interface LocalAsrPolicy {
	executable: string;
	model: string;
	maxDurationMs: number;
	timeoutMs: number;
}

export type AsrDiagnostic =
	| { reason: "duration-limit"; durationMs: number; limitMs: number }
	| {
			reason:
				| "missing-executable"
				| "timeout"
				| "process-error"
				| "invalid-output"
				| "cleanup-error";
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
	rm: (path: string, opts: { recursive: true; force: true }) => Promise<void>;
}

export type LocalAsrResult = {
	segments: TranscriptSegment[];
	source: "whisper" | "none";
};

type ExecFailure = {
	code?: string | number;
	killed?: boolean;
	signal?: NodeJS.Signals | null;
};

const execFileAsync = promisify(execFile);

const DEFAULT_LOCAL_ASR_DEPS: LocalAsrDeps = {
	mkdtemp: fsMkdtemp,
	run: async (bin, args, opts) => {
		const { stdout, stderr } = await execFileAsync(bin, args as string[], {
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

const NONE: LocalAsrResult = { segments: [], source: "none" };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Convert parsed mlx-whisper JSON into validated shared-timeline segments. */
export function parseMlxWhisperJson(input: unknown, durationMs: number): TranscriptSegment[] {
	if (!isRecord(input) || !Array.isArray(input.segments)) return [];
	if (!Number.isFinite(durationMs) || durationMs < 0) return [];

	const parsed: Array<TranscriptSegment & { order: number }> = [];
	for (const [order, candidate] of input.segments.entries()) {
		if (!isRecord(candidate)) continue;
		const { start, end, text } = candidate;
		if (
			typeof start !== "number" ||
			typeof end !== "number" ||
			!Number.isFinite(start) ||
			!Number.isFinite(end) ||
			start < 0 ||
			end < start ||
			start * 1000 >= durationMs ||
			typeof text !== "string" ||
			text.trim() === ""
		) {
			continue;
		}

		const startMs = Math.round(start * 1000);
		const endMs = Math.min(durationMs, Math.round(end * 1000));
		if (endMs < startMs) continue;
		parsed.push({ startMs, endMs, text: text.trim(), source: "whisper", order });
	}

	return parsed
		.sort((a, b) => a.startMs - b.startMs || a.order - b.order)
		.map(({ order: _order, ...segment }) => segment);
}

function emitDiagnostic(
	onDiagnostic: ((diagnostic: AsrDiagnostic) => void) | undefined,
	diagnostic: AsrDiagnostic,
): void {
	try {
		onDiagnostic?.(diagnostic);
	} catch {
		/* diagnostics are a best-effort side channel */
	}
}

function classifyProcessFailure(error: unknown): AsrDiagnostic {
	const failure = isRecord(error) ? (error as ExecFailure) : {};
	if (failure.code === "ENOENT") return { reason: "missing-executable" };
	if (failure.killed || failure.signal === "SIGTERM" || failure.signal === "SIGKILL") {
		return { reason: "timeout" };
	}
	return { reason: "process-error" };
}

/** Run one bounded direct mlx-whisper process and read only its owned JSON output. */
export async function fetchLocalAsrTranscript(
	mediaRef: string,
	durationMs: number,
	policy: LocalAsrPolicy,
	deps: LocalAsrDeps = DEFAULT_LOCAL_ASR_DEPS,
	onDiagnostic?: (diagnostic: AsrDiagnostic) => void,
): Promise<LocalAsrResult> {
	if (durationMs > policy.maxDurationMs) {
		emitDiagnostic(onDiagnostic, {
			reason: "duration-limit",
			durationMs,
			limitMs: policy.maxDurationMs,
		});
		return NONE;
	}

	let outputDir: string;
	try {
		outputDir = await deps.mkdtemp(join(tmpdir(), "pi-watch-asr-"));
	} catch {
		emitDiagnostic(onDiagnostic, { reason: "invalid-output" });
		return NONE;
	}

	let result: LocalAsrResult = NONE;
	let stage: "process" | "output" = "process";
	try {
		await deps.run(
			policy.executable,
			[
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
			],
			{ timeoutMs: policy.timeoutMs, maxBuffer: MAX_LOCAL_ASR_OUTPUT_BYTES },
		);

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
		const segments = parseMlxWhisperJson(JSON.parse(raw) as unknown, durationMs);
		if (segments.length === 0) throw new Error("ASR output contained no valid segments");
		result = { segments, source: "whisper" };
	} catch (error) {
		emitDiagnostic(
			onDiagnostic,
			stage === "process" ? classifyProcessFailure(error) : { reason: "invalid-output" },
		);
		result = NONE;
	} finally {
		try {
			await deps.rm(outputDir, { recursive: true, force: true });
		} catch {
			emitDiagnostic(onDiagnostic, { reason: "cleanup-error" });
			result = NONE;
		}
	}

	return result;
}
