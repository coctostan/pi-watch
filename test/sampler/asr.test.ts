import { describe, expect, it, vi } from "vitest";
import {
	DEFAULT_LOCAL_ASR_EXECUTABLE,
	DEFAULT_LOCAL_ASR_MODEL,
	DEFAULT_LOCAL_ASR_TIMEOUT_MS,
	MAX_LOCAL_ASR_OUTPUT_BYTES,
	fetchLocalAsrTranscript,
	parseMlxWhisperJson,
	type AsrDiagnostic,
	type LocalAsrDeps,
	type LocalAsrPolicy,
} from "../../src/sampler/asr.js";

const POLICY: LocalAsrPolicy = {
	executable: DEFAULT_LOCAL_ASR_EXECUTABLE,
	model: DEFAULT_LOCAL_ASR_MODEL,
	maxDurationMs: 600_000,
	timeoutMs: DEFAULT_LOCAL_ASR_TIMEOUT_MS,
};

function validOutput(text = "hello"): string {
	return JSON.stringify({ segments: [{ start: 0.1254, end: 1.9996, text }] });
}

function makeDeps(overrides: Partial<LocalAsrDeps> = {}): LocalAsrDeps {
	return {
		mkdtemp: vi.fn(async () => "/tmp/pi-watch-asr-owned"),
		run: vi.fn(async () => ({ stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) })),
		stat: vi.fn(async () => ({ size: Buffer.byteLength(validOutput()), isFile: () => true })),
		readFile: vi.fn(async () => validOutput()),
		rm: vi.fn(async () => undefined),
		...overrides,
	};
}

function diagnosticKeys(diagnostic: AsrDiagnostic): string[] {
	return Object.keys(diagnostic).sort();
}

describe("parseMlxWhisperJson", () => {
	it("turns valid segments into stable start-ordered rounded whisper timestamps", () => {
		expect(
			parseMlxWhisperJson(
				{
					text: "must never be synthesized",
					segments: [
						{ start: 1.0004, end: 9, text: " later " },
						{ start: 0.1254, end: 0.8755, text: " first " },
						{ start: 1.0004, end: 1.5, text: "equal start" },
					],
				},
				2_000,
			),
		).toEqual([
			{ startMs: 125, endMs: 876, text: "first", source: "whisper" },
			{ startMs: 1000, endMs: 2000, text: "later", source: "whisper" },
			{ startMs: 1000, endMs: 1500, text: "equal start", source: "whisper" },
		]);
	});

	it.each([
		null,
		[],
		{},
		{ segments: null },
		{ segments: "not-an-array" },
	])("rejects a malformed top-level segments shape: %j", (input) => {
		expect(parseMlxWhisperJson(input, 2_000)).toEqual([]);
	});

	it("drops invalid entries, including non-finite, negative, reversed, out-of-range, and empty text", () => {
		const output = parseMlxWhisperJson(
			{
				segments: [
					{ start: 0, end: 1, text: "valid" },
					{ start: Number.NaN, end: 1, text: "nan" },
					{ start: 0, end: Number.POSITIVE_INFINITY, text: "infinity" },
					{ start: -1, end: 1, text: "negative" },
					{ start: 1, end: 0, text: "reversed" },
					{ start: 2, end: 2, text: "at duration" },
					{ start: 0, end: 1, text: "   " },
					{ start: "0", end: 1, text: "wrong type" },
				],
			},
			2_000,
		);
		expect(output).toEqual([{ startMs: 0, endMs: 1000, text: "valid", source: "whisper" }]);
	});

	it("never fabricates a segment from aggregate top-level text", () => {
		expect(parseMlxWhisperJson({ text: "aggregate only", segments: [] }, 2_000)).toEqual([]);
	});
});

describe("fetchLocalAsrTranscript", () => {
	it("rejects over-duration media before creating storage or spawning", async () => {
		const deps = makeDeps();
		const onDiagnostic = vi.fn<(value: AsrDiagnostic) => void>();

		await expect(
			fetchLocalAsrTranscript("borrowed.mp4", 600_001, POLICY, deps, onDiagnostic),
		).resolves.toEqual({ segments: [], source: "none" });
		expect(deps.mkdtemp).not.toHaveBeenCalled();
		expect(deps.run).not.toHaveBeenCalled();
		expect(onDiagnostic).toHaveBeenCalledWith({
			reason: "duration-limit",
			durationMs: 600_001,
			limitMs: 600_000,
		});
	});

	it("executes the configured binary with one media argument and the exact bounded JSON contract", async () => {
		const deps = makeDeps();

		await expect(fetchLocalAsrTranscript("borrowed media.mp4", 2_000, POLICY, deps)).resolves.toEqual({
			segments: [{ startMs: 125, endMs: 2000, text: "hello", source: "whisper" }],
			source: "whisper",
		});
		expect(deps.mkdtemp).toHaveBeenCalledWith(expect.stringContaining("pi-watch-asr-"));
		expect(deps.run).toHaveBeenCalledWith(
			"mlx_whisper",
			[
				"borrowed media.mp4",
				"--model",
				"mlx-community/whisper-tiny",
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
				"/tmp/pi-watch-asr-owned",
			],
			{ timeoutMs: 300_000, maxBuffer: MAX_LOCAL_ASR_OUTPUT_BYTES },
		);
		expect(deps.stat).toHaveBeenCalledWith("/tmp/pi-watch-asr-owned/transcript.json");
		expect(deps.readFile).toHaveBeenCalledWith(
			"/tmp/pi-watch-asr-owned/transcript.json",
			"utf8",
		);
		expect(deps.rm).toHaveBeenCalledTimes(1);
		expect(deps.rm).toHaveBeenCalledWith("/tmp/pi-watch-asr-owned", {
			recursive: true,
			force: true,
		});
	});

	it.each([
		["missing-executable", { run: vi.fn(async () => Promise.reject({ code: "ENOENT" })) }],
		["timeout", { run: vi.fn(async () => Promise.reject({ killed: true })) }],
		["process-error", { run: vi.fn(async () => Promise.reject(new Error("exit 2 secret stderr"))) }],
		["invalid-output", { stat: vi.fn(async () => Promise.reject(new Error("missing"))) }],
		["invalid-output", { stat: vi.fn(async () => ({ size: 1, isFile: () => false })) }],
		[
			"invalid-output",
			{ stat: vi.fn(async () => ({ size: MAX_LOCAL_ASR_OUTPUT_BYTES + 1, isFile: () => true })) },
		],
		["invalid-output", { readFile: vi.fn(async () => Promise.reject(new Error("read failed"))) }],
		["invalid-output", { readFile: vi.fn(async () => "{not json") }],
		["invalid-output", { readFile: vi.fn(async () => JSON.stringify({ segments: [] })) }],
	] as const)("degrades %s failures to none with one private diagnostic and cleanup", async (reason, overrides) => {
		const deps = makeDeps(overrides as Partial<LocalAsrDeps>);
		const diagnostics: AsrDiagnostic[] = [];

		await expect(
			fetchLocalAsrTranscript("/private/user/movie.mp4", 2_000, POLICY, deps, (value) => {
				diagnostics.push(value);
			}),
		).resolves.toEqual({ segments: [], source: "none" });
		expect(deps.rm).toHaveBeenCalledTimes(1);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]?.reason).toBe(reason);
		expect(JSON.stringify(diagnostics)).not.toMatch(/movie|private|stderr|transcript/i);
		expect(diagnosticKeys(diagnostics[0]!)).not.toContain("ref");
	});

	it("degrades temporary-directory setup failure without attempting cleanup", async () => {
		const deps = makeDeps({ mkdtemp: vi.fn(async () => Promise.reject(new Error("setup failed"))) });
		const onDiagnostic = vi.fn<(value: AsrDiagnostic) => void>();
		await expect(
			fetchLocalAsrTranscript("borrowed.mp4", 2_000, POLICY, deps, onDiagnostic),
		).resolves.toEqual({ segments: [], source: "none" });
		expect(deps.rm).not.toHaveBeenCalled();
		expect(onDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ reason: "invalid-output" }));
	});

	it("turns cleanup failure into none and never removes caller media or user caches", async () => {
		const rm = vi.fn(async () => Promise.reject(new Error("cleanup failed")));
		const deps = makeDeps({ rm });
		const onDiagnostic = vi.fn<(value: AsrDiagnostic) => void>();

		await expect(
			fetchLocalAsrTranscript("/users/me/movie.mp4", 2_000, POLICY, deps, onDiagnostic),
		).resolves.toEqual({ segments: [], source: "none" });
		expect(rm).toHaveBeenCalledTimes(1);
		expect(rm).toHaveBeenCalledWith("/tmp/pi-watch-asr-owned", { recursive: true, force: true });
		expect(onDiagnostic).toHaveBeenCalledWith({ reason: "cleanup-error" });
	});

	it("ignores diagnostic consumer failures without changing ASR success or fallback", async () => {
		const throwingDiagnostic = vi.fn(() => {
			throw new Error("consumer failed");
		});
		await expect(
			fetchLocalAsrTranscript(
				"borrowed.mp4",
				600_001,
				POLICY,
				makeDeps(),
				throwingDiagnostic,
			),
		).resolves.toEqual({ segments: [], source: "none" });
	});
});
