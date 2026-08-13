import { Buffer } from "node:buffer";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(TEST_DIR, "../..");
const FIXTURE_PATH = resolve(
	PACKAGE_ROOT,
	"test/fixtures/context-efficiency/transcript-first.fixture.json",
);

type CaptionCue = { startMs: number; endMs: number; text: string };
type Range = { startMs: number; endMs: number };
type TranscriptExpectation = {
	range: Range;
	availableTranscriptCount: number;
	returnedTranscriptCount: number;
	resultBytes: number;
	resultTextBytes: number;
};
type TranscriptCase = {
	intent: "spoken" | "broad";
	question: string;
	start?: number;
	end?: number;
	expected: TranscriptExpectation;
};
type CorpusFixture = {
	schemaVersion: number;
	packageVersion: string;
	media: { videoId: string; durationMs: number; captions: CaptionCue[] };
	expectedCorpus: { rawTranscriptBytes: number; normalizedTranscriptBytes: number };
	transcriptCases: TranscriptCase[];
	visualControl: {
		intent: "visual";
		question: string;
		budget: number;
		expected: TranscriptExpectation & {
			frameCount: number;
			returnedFrameCount: number;
			sceneCalls: number;
			decodeCalls: number;
		};
	};
};

type ContentPart = { type: string; text?: string; data?: string; mimeType?: string };
type Evidence = {
	frames: { count: number; firstMs: number | null; lastMs: number | null };
	transcript: { count: number; firstMs: number | null; lastMs: number | null };
};
type ToolResult = {
	content: ContentPart[];
	details: {
		tier: number;
		intent: string;
		frameCount: number;
		range: Range;
		availableEvidence: Evidence;
		returnedEvidence: Evidence;
	};
};
type CapturedTool = {
	name: string;
	execute: (toolCallId: string, params: Record<string, unknown>) => Promise<unknown>;
};

function formatVttMs(ms: number): string {
	const hours = Math.floor(ms / 3_600_000);
	const minutes = Math.floor((ms % 3_600_000) / 60_000);
	const seconds = Math.floor((ms % 60_000) / 1000);
	const millis = ms % 1000;
	return [hours, minutes, seconds]
		.map((value) => String(value).padStart(2, "0"))
		.join(":") + `.${String(millis).padStart(3, "0")}`;
}

function toVtt(cues: CaptionCue[]): string {
	return [
		"WEBVTT - synthetic transcript-first corpus",
		"",
		...cues.flatMap((cue, index) => [
			`cue-${index + 1}`,
			`${formatVttMs(cue.startMs)} --> ${formatVttMs(cue.endMs)}`,
			cue.text,
			"",
		]),
	].join("\n");
}

function resultBytes(result: ToolResult): number {
	return Buffer.byteLength(JSON.stringify(result), "utf8");
}

function resultTextBytes(result: ToolResult): number {
	return Buffer.byteLength(
		result.content
			.filter((part) => part.type === "text")
			.map((part) => part.text ?? "")
			.join("\n"),
		"utf8",
	);
}

function normalizedTranscriptBytes(result: ToolResult): number {
	const transcript = result.content
		.filter((part) => part.type === "text" && /^\d{2}(?::\d{2}){1,2} /.test(part.text ?? ""))
		.map((part) => (part.text ?? "").replace(/^\d{2}(?::\d{2}){1,2} /, ""))
		.join("\n");
	return Buffer.byteLength(transcript, "utf8");
}

function scenarioLabel(
	fixture: CorpusFixture,
	scenario: { intent: string; question: string; start?: number; end?: number },
): string {
	return [
		scenario.intent,
		`${scenario.start ?? 0}-${scenario.end ?? fixture.media.durationMs / 1000}`,
		scenario.question,
	].join(":");
}

async function loadCompiledWatch(): Promise<{
	watch: CapturedTool;
	extensionPath: string;
	packageVersion: string;
}> {
	const packageJson = JSON.parse(await readFile(resolve(PACKAGE_ROOT, "package.json"), "utf8")) as {
		version: string;
		pi?: { extensions?: string[] };
	};
	const declaredPath = packageJson.pi?.extensions?.[0];
	if (!declaredPath) throw new Error("package.json does not declare pi.extensions[0]");
	const extensionPath = resolve(PACKAGE_ROOT, declaredPath);
	const module = (await import(`${pathToFileURL(extensionPath).href}?phase23-context-efficiency`)) as {
		default: (pi: ExtensionAPI) => void;
	};
	const tools: CapturedTool[] = [];
	const pi = {
		registerTool(tool: CapturedTool) {
			tools.push(tool);
		},
		registerCommand() {},
		sendUserMessage() {},
	} as unknown as ExtensionAPI;
	module.default(pi);
	const watch = tools.find((tool) => tool.name === "watch");
	if (!watch) throw new Error("compiled extension did not register watch");
	return { watch, extensionPath, packageVersion: packageJson.version };
}

async function writeExecutable(path: string, lines: string[]): Promise<void> {
	await writeFile(path, `${lines.join("\n")}\n`, "utf8");
	await chmod(path, 0o755);
}

describe("[phase23][R4][R6][R22] compiled transcript-first context efficiency", () => {
	it("proves exact corpus metrics and zero transcript-route visual work through package registration", async () => {
		const fixture = JSON.parse(await readFile(FIXTURE_PATH, "utf8")) as CorpusFixture;
		expect(fixture.schemaVersion).toBe(1);
		expect(fixture.media.videoId).toMatch(/^[A-Za-z0-9_-]{11}$/);
		expect(
			Buffer.byteLength(fixture.media.captions.map((cue) => cue.text).join("\n"), "utf8"),
		).toBe(fixture.expectedCorpus.rawTranscriptBytes);

		const ownedRoot = await mkdtemp(join(tmpdir(), "pi-watch-phase23-context-"));
		const binDir = join(ownedRoot, "bin");
		const fixtureDir = join(ownedRoot, "fixtures");
		const ledgerPath = join(ownedRoot, "calls.tsv");
		const framePath = join(ownedRoot, "frame.bin");
		try {
		await mkdir(binDir);
		await mkdir(fixtureDir);
		await writeFile(join(fixtureDir, `${fixture.media.videoId}.vtt`), toVtt(fixture.media.captions), "utf8");
		await writeFile(framePath, Buffer.alloc(2048, 0x41));
		await writeFile(ledgerPath, "", "utf8");

		await writeExecutable(join(binDir, "yt-dlp"), [
			"#!/bin/sh",
			"set -eu",
			"output=''",
			"previous=''",
			"url=''",
			"captions=0",
			"for arg in \"$@\"; do",
			"  if [ \"$previous\" = '-o' ]; then output=$arg; fi",
			"  if [ \"$arg\" = '--skip-download' ]; then captions=1; fi",
			"  previous=$arg",
			"  url=$arg",
			"done",
			"id=${url##*=}",
			"dir=${output%/*}",
			"if [ \"$captions\" -eq 1 ]; then",
			"  cp \"$PI_WATCH_FIXTURE_DIR/$id.vtt\" \"$dir/human.$id.en.vtt\"",
			"  printf 'yt-dlp\\tcaptions\\n' >> \"$PI_WATCH_LEDGER\"",
			"else",
			"  media=\"$dir/$id.mp4\"",
			"  printf 'synthetic media' > \"$media\"",
			"  printf '%s\\n' \"$media\"",
			"  printf 'yt-dlp\\tmedia\\n' >> \"$PI_WATCH_LEDGER\"",
			"fi",
		]);
		await writeExecutable(join(binDir, "ffprobe"), [
			"#!/bin/sh",
			"set -eu",
			`printf '${(fixture.media.durationMs / 1000).toFixed(3)}\\n'`,
			"printf 'ffprobe\\tduration\\n' >> \"$PI_WATCH_LEDGER\"",
		]);
		await writeExecutable(join(binDir, "ffmpeg"), [
			"#!/bin/sh",
			"set -eu",
			"scene=0",
			"for arg in \"$@\"; do",
			"  case \"$arg\" in *showinfo*) scene=1 ;; esac",
			"done",
			"if [ \"$scene\" -eq 1 ]; then",
			"  printf 'pts_time:2.000\\npts_time:8.000\\n' >&2",
			"  printf 'ffmpeg\\tscene\\n' >> \"$PI_WATCH_LEDGER\"",
			"else",
			"  cat \"$PI_WATCH_FRAME\"",
			"  printf 'ffmpeg\\tdecode\\n' >> \"$PI_WATCH_LEDGER\"",
			"fi",
		]);
		} catch (error) {
			await rm(ownedRoot, { recursive: true, force: true });
			throw error;
		}

		const savedEnv = {
			PATH: process.env.PATH,
			PI_WATCH_LEDGER: process.env.PI_WATCH_LEDGER,
			PI_WATCH_FIXTURE_DIR: process.env.PI_WATCH_FIXTURE_DIR,
			PI_WATCH_FRAME: process.env.PI_WATCH_FRAME,
		};
		process.env.PATH = `${binDir}${delimiter}${savedEnv.PATH ?? ""}`;
		process.env.PI_WATCH_LEDGER = ledgerPath;
		process.env.PI_WATCH_FIXTURE_DIR = fixtureDir;
		process.env.PI_WATCH_FRAME = framePath;

		try {
			const registration = await loadCompiledWatch();
			expect(registration.extensionPath).toBe(
				resolve(PACKAGE_ROOT, "dist/watch/extension.js"),
			);
			expect(registration.packageVersion).toBe(fixture.packageVersion);

			const transcriptResults: ToolResult[] = [];
			for (const scenario of fixture.transcriptCases) {
				await writeFile(ledgerPath, "", "utf8");
				const label = scenarioLabel(fixture, scenario);
				const result = (await registration.watch.execute(label, {
					ref: `https://youtu.be/${fixture.media.videoId}`,
					question: scenario.question,
					...(scenario.start === undefined ? {} : { start: scenario.start }),
					...(scenario.end === undefined ? {} : { end: scenario.end }),
				})) as ToolResult;
				const ledger = await readFile(ledgerPath, "utf8");

				expect(result.details, label).toMatchObject({
					tier: 1,
					intent: scenario.intent,
					frameCount: 0,
					range: scenario.expected.range,
					availableEvidence: {
						frames: { count: 0 },
						transcript: { count: scenario.expected.availableTranscriptCount },
					},
					returnedEvidence: {
						frames: { count: 0 },
						transcript: { count: scenario.expected.returnedTranscriptCount },
					},
				});
				expect(ledger, label).not.toContain("ffmpeg\t");
				expect(
					{ resultBytes: resultBytes(result), resultTextBytes: resultTextBytes(result) },
					label,
				).toEqual({
					resultBytes: scenario.expected.resultBytes,
					resultTextBytes: scenario.expected.resultTextBytes,
				});
				transcriptResults.push(result);
			}
			expect(normalizedTranscriptBytes(transcriptResults[0]!)).toBe(
				fixture.expectedCorpus.normalizedTranscriptBytes,
			);

			await writeFile(ledgerPath, "", "utf8");
			const control = fixture.visualControl;
			const controlResult = (await registration.watch.execute(
				scenarioLabel(fixture, control),
				{
					ref: `https://youtu.be/${fixture.media.videoId}`,
					question: control.question,
					budget: control.budget,
				},
			)) as ToolResult;
			const controlLedger = await readFile(ledgerPath, "utf8");
			const sceneCalls = controlLedger.split("\n").filter((line) => line === "ffmpeg\tscene").length;
			const decodeCalls = controlLedger.split("\n").filter((line) => line === "ffmpeg\tdecode").length;

			expect(controlResult.details).toMatchObject({
				tier: 3,
				intent: control.intent,
				frameCount: control.expected.frameCount,
				range: control.expected.range,
				availableEvidence: {
					transcript: { count: control.expected.availableTranscriptCount },
				},
				returnedEvidence: {
					frames: { count: control.expected.returnedFrameCount },
					transcript: { count: control.expected.returnedTranscriptCount },
				},
			});
			expect(sceneCalls).toBe(control.expected.sceneCalls);
			expect(decodeCalls).toBe(control.expected.decodeCalls);
			expect(sceneCalls + decodeCalls).toBeGreaterThan(0);
			expect(sceneCalls + decodeCalls).toBeLessThanOrEqual(control.budget + 1);
			expect({
				resultBytes: resultBytes(controlResult),
				resultTextBytes: resultTextBytes(controlResult),
			}).toEqual({
				resultBytes: control.expected.resultBytes,
				resultTextBytes: control.expected.resultTextBytes,
			});
			for (const result of transcriptResults) {
				expect(resultBytes(result)).toBeLessThan(resultBytes(controlResult));
			}
		} finally {
			for (const [key, value] of Object.entries(savedEnv)) {
				if (value === undefined) delete process.env[key];
				else process.env[key] = value;
			}
			await rm(ownedRoot, { recursive: true, force: true });
		}
		await expect(access(ownedRoot)).rejects.toMatchObject({ code: "ENOENT" });
	}, 60_000);
});
