import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const execFileAsync = promisify(execFile);
const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(TEST_DIR, "../..");
const FIXTURE_PATH = resolve(TEST_DIR, "../fixtures/asr/english-speech.mp4");
const MANIFEST_PATH = resolve(TEST_DIR, "../fixtures/asr/english-speech.fixture.json");
const LIVE_ASR_ENABLED = process.env.WATCH_ASR_LIVE === "1";
const LIVE_ASR_ENV = {
	executable: process.env.WATCH_ASR_EXECUTABLE,
	model: process.env.WATCH_ASR_MODEL,
	maxDurationMs: process.env.WATCH_ASR_MAX_DURATION_MS,
	timeoutMs: process.env.WATCH_ASR_TIMEOUT_MS,
};

const PHRASE =
	"This is a deterministic English speech fixture for pi watch. The quick brown fox jumps over the lazy dog. Local transcription should preserve useful words and timestamps.";
const EVIDENCE_WORDS = [
	"english",
	"speech",
	"quick",
	"brown",
	"fox",
	"local",
	"transcription",
	"timestamps",
] as const;
const WATCH_ENV_KEYS = [
	"WATCH_BUDGET",
	"WATCH_RESOLUTION",
	"WATCH_TIER2_BASE_URL",
	"WATCH_TIER2_MODEL",
	"WATCH_TIER2_API_KEY",
	"WATCH_TIER2_LOCAL",
	"WATCH_TIER2_TIMEOUT_MS",
	"WATCH_ASR_LOCAL",
	"WATCH_ASR_EXECUTABLE",
	"WATCH_ASR_MODEL",
	"WATCH_ASR_MAX_DURATION_MS",
	"WATCH_ASR_TIMEOUT_MS",
] as const;

type FixtureManifest = {
	schemaVersion: number;
	phrase: string;
	evidenceWords: string[];
	media: {
		maxDurationMs: number;
		maxBytes: number;
		videoStreams: number;
		audioStreams: number;
		audioChannels: number;
	};
	provenance: {
		platform: string;
		speechGenerator: string;
		mediaEncoder: string;
		speechCommand: string;
		mediaCommand: string;
		regenerationNote: string;
	};
	sha256: string;
};

type CapturedTool = {
	name: string;
	execute: (toolCallId: string, params: Record<string, unknown>) => Promise<unknown>;
};

type ToolResult = {
	content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
	details: Record<string, unknown>;
};

type RegisteredExtension = {
	tools: CapturedTool[];
	commands: string[];
};

let savedEnv: Partial<Record<(typeof WATCH_ENV_KEYS)[number], string>>;

beforeEach(() => {
	savedEnv = {};
	for (const key of WATCH_ENV_KEYS) {
		savedEnv[key] = process.env[key];
		delete process.env[key];
	}
});

afterEach(() => {
	for (const key of WATCH_ENV_KEYS) {
		const value = savedEnv[key];
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	vi.restoreAllMocks();
});

async function readManifest(): Promise<FixtureManifest> {
	return JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as FixtureManifest;
}

async function packageExtensionPath(): Promise<string> {
	const packageJson = JSON.parse(
		await readFile(resolve(PACKAGE_ROOT, "package.json"), "utf8"),
	) as { pi?: { extensions?: string[] } };
	const extension = packageJson.pi?.extensions?.[0];
	if (!extension) throw new Error("package.json does not declare pi.extensions[0]");
	const extensionPath = resolve(PACKAGE_ROOT, extension);
	await access(extensionPath);
	return extensionPath;
}

async function registerCompiledExtension(): Promise<RegisteredExtension> {
	const extensionPath = await packageExtensionPath();
	const extensionModule = (await import(pathToFileURL(extensionPath).href)) as {
		default: (pi: ExtensionAPI) => void;
	};
	const tools: CapturedTool[] = [];
	const commands: string[] = [];
	const pi = {
		registerTool(tool: CapturedTool) {
			tools.push(tool);
		},
		registerCommand(name: string) {
			commands.push(name);
		},
		sendUserMessage() {},
	} as unknown as ExtensionAPI;
	extensionModule.default(pi);
	return { tools, commands };
}

function capturedWatch(registration: RegisteredExtension): CapturedTool {
	const watch = registration.tools.find((tool) => tool.name === "watch");
	if (!watch) throw new Error("compiled extension did not register the watch tool");
	return watch;
}

function asToolResult(value: unknown): ToolResult {
	return value as ToolResult;
}

function transcriptText(result: ToolResult): string {
	return result.content
		.filter((part) => part.type === "text")
		.map((part) => part.text ?? "")
		.join("\n");
}

function timestampSeconds(timestamp: string): number {
	const parts = timestamp.split(":").map(Number);
	if (parts.some((part) => !Number.isFinite(part))) return Number.NaN;
	if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
	if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
	return Number.NaN;
}

describe("Phase 19 registered local-ASR proof", () => {
	it("[phase19][AC-1] validates the deterministic bounded English fixture", async () => {
		const manifest = await readManifest();
		const fixture = await readFile(FIXTURE_PATH);
		const fixtureStat = await stat(FIXTURE_PATH);

		expect(manifest.schemaVersion).toBe(1);
		expect(manifest.phrase).toBe(PHRASE);
		expect(manifest.evidenceWords).toEqual(EVIDENCE_WORDS);
		expect(manifest.provenance.speechGenerator).toContain("macOS say");
		expect(manifest.provenance.mediaEncoder).toContain("ffmpeg");
		expect(manifest.provenance.regenerationNote).toContain("SHA-256");
		expect(createHash("sha256").update(fixture).digest("hex")).toBe(manifest.sha256);
		expect(fixtureStat.size).toBeLessThanOrEqual(manifest.media.maxBytes);

		const { stdout } = await execFileAsync(
			"ffprobe",
			[
				"-v",
				"error",
				"-show_entries",
				"format=duration:stream=codec_type,channels",
				"-of",
				"json",
				FIXTURE_PATH,
			],
			{ encoding: "utf8" },
		);
		const probe = JSON.parse(stdout) as {
			format: { duration: string };
			streams: Array<{ codec_type: string; channels?: number }>;
		};
		const durationMs = Number(probe.format.duration) * 1000;
		const videoStreams = probe.streams.filter((stream) => stream.codec_type === "video");
		const audioStreams = probe.streams.filter((stream) => stream.codec_type === "audio");

		expect(Number.isFinite(durationMs)).toBe(true);
		expect(durationMs).toBeGreaterThan(0);
		expect(durationMs).toBeLessThanOrEqual(manifest.media.maxDurationMs);
		expect(videoStreams).toHaveLength(manifest.media.videoStreams);
		expect(audioStreams).toHaveLength(manifest.media.audioStreams);
		expect(audioStreams[0]?.channels).toBe(manifest.media.audioChannels);
	});

	it("[phase19][AC-2] preserves private typed fallback through the compiled registration", async () => {
		const missingExecutable = "pi-watch-phase19-guaranteed-missing-asr";
		const privateModelPath = "/private/model-cache/phase19-model";
		const privateCredential = "phase19-private-api-key";
		process.env.WATCH_ASR_LOCAL = "1";
		process.env.WATCH_ASR_EXECUTABLE = missingExecutable;
		process.env.WATCH_ASR_MODEL = privateModelPath;
		process.env.WATCH_TIER2_API_KEY = privateCredential;
		const fetchSpy = vi.spyOn(globalThis, "fetch");

		const registration = await registerCompiledExtension();
		expect(registration.tools.map((tool) => tool.name)).toEqual(["watch", "watch_batch"]);
		expect(registration.commands).toContain("watch");

		const result = asToolResult(
			await capturedWatch(registration).execute("phase19-ac2", {
				ref: FIXTURE_PATH,
				question: "What does the speaker say?",
				budget: 1,
				resolution: "low",
			}),
		);

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(result.details).toMatchObject({
			tier: 3,
			intent: "spoken",
			transcriptSource: "none",
			asr: { reason: "missing-executable" },
		});
		expect(result.details.frameCount).toEqual(expect.any(Number));
		expect(result.details.frameCount as number).toBeGreaterThan(0);
		expect(
			result.content.some(
				(part) => part.type === "image" && typeof part.data === "string" && part.data.length > 0,
			),
		).toBe(true);

		const serializedDetails = JSON.stringify(result.details);
		for (const privateValue of [
			FIXTURE_PATH,
			PHRASE,
			missingExecutable,
			privateModelPath,
			privateCredential,
			process.env.HOME ?? "__no_home__",
		]) {
			expect(serializedDetails).not.toContain(privateValue);
		}
		expect(serializedDetails.toLowerCase()).not.toContain("stderr");
		expect(serializedDetails.toLowerCase()).not.toContain("credential");
	});


	it("[phase19][AC-4] validates v0.4 package metadata, docs, and packed extension", async () => {
		const packageJson = JSON.parse(
			await readFile(resolve(PACKAGE_ROOT, "package.json"), "utf8"),
		) as Record<string, unknown>;
		const packageLock = JSON.parse(
			await readFile(resolve(PACKAGE_ROOT, "package-lock.json"), "utf8"),
		) as {
			version: string;
			lockfileVersion: number;
			packages: Record<string, Record<string, unknown>>;
		};
		const readme = await readFile(resolve(PACKAGE_ROOT, "README.md"), "utf8");
		const runbook = await readFile(resolve(PACKAGE_ROOT, "docs/LOCAL-ASR-SETUP.md"), "utf8");

		expect(packageJson).toMatchObject({
			name: "pi-watch",
			version: "0.4.0",
			type: "module",
			main: "dist/contract/index.js",
			types: "dist/contract/index.d.ts",
			files: ["dist"],
			pi: { extensions: ["./dist/watch/extension.js"] },
			engines: { node: ">=20" },
			scripts: {
				build: "tsc -p tsconfig.json",
				typecheck: "tsc -p tsconfig.test.json",
				test: "vitest run",
				"test:watch": "vitest",
			},
			peerDependencies: {
				"@earendil-works/pi-ai": "*",
				"@earendil-works/pi-coding-agent": "*",
				typebox: "*",
			},
			devDependencies: {
				"@earendil-works/pi-ai": "^0.79.8",
				"@earendil-works/pi-coding-agent": "^0.79.8",
				"@types/node": "^22.10.0",
				typebox: "^1.2.16",
				typescript: "^5.7.0",
				vitest: "^4.1.9",
			},
		});
		expect(packageJson.dependencies).toBeUndefined();
		expect(packageLock.version).toBe("0.4.0");
		expect(packageLock.lockfileVersion).toBe(3);
		expect(packageLock.packages[""]).toMatchObject({
			name: "pi-watch",
			version: "0.4.0",
			engines: packageJson.engines,
			peerDependencies: packageJson.peerDependencies,
			devDependencies: packageJson.devDependencies,
		});
		expect(packageLock.packages["node_modules/@aws/lambda-invoke-store"]?.version).toBe("0.3.0");
		await expect(packageExtensionPath()).resolves.toBe(resolve(PACKAGE_ROOT, "dist/watch/extension.js"));

		for (const marker of [
			"docs/LOCAL-ASR-SETUP.md",
			"WATCH_ASR_LOCAL=1",
			"WATCH_ASR_EXECUTABLE",
			"WATCH_ASR_MODEL",
			"WATCH_ASR_MAX_DURATION_MS",
			"WATCH_ASR_TIMEOUT_MS",
			"npm:pi-watch",
			"After the `v0.4.0` tag has actually been published",
		]) {
			expect(readme).toContain(marker);
		}
		for (const marker of [
			"WATCH_ASR_LOCAL",
			"WATCH_ASR_EXECUTABLE",
			"WATCH_ASR_MODEL",
			"WATCH_ASR_MAX_DURATION_MS",
			"WATCH_ASR_TIMEOUT_MS",
			"duration-limit",
			"missing-executable",
			"timeout",
			"process-error",
			"invalid-output",
			"cleanup-error",
			"durationMs",
			"limitMs",
			"details.asr",
			"user-owned",
			"not uploaded",
			"WATCH_ASR_LIVE=1",
			PHRASE,
		]) {
			expect(runbook).toContain(marker);
		}

		const { stdout } = await execFileAsync("npm", ["pack", "--dry-run", "--json"], {
			cwd: PACKAGE_ROOT,
			encoding: "utf8",
			maxBuffer: 4 * 1024 * 1024,
		});
		const packResult = JSON.parse(stdout) as Array<{ files: Array<{ path: string }> }>;
		expect(packResult[0]?.files.map((file) => file.path)).toContain("dist/watch/extension.js");
	});

	const liveTest = LIVE_ASR_ENABLED ? it : it.skip;
	liveTest(
		"[phase19][AC-3] reaches tier 1 through explicitly enabled bounded real local ASR",
		async () => {
			const manifest = await readManifest();
			process.env.WATCH_ASR_LOCAL = "1";
			if (LIVE_ASR_ENV.executable) process.env.WATCH_ASR_EXECUTABLE = LIVE_ASR_ENV.executable;
			if (LIVE_ASR_ENV.model) process.env.WATCH_ASR_MODEL = LIVE_ASR_ENV.model;
			process.env.WATCH_ASR_MAX_DURATION_MS = LIVE_ASR_ENV.maxDurationMs ?? "15000";
			process.env.WATCH_ASR_TIMEOUT_MS = LIVE_ASR_ENV.timeoutMs ?? "300000";

			const registration = await registerCompiledExtension();
			const result = asToolResult(
				await capturedWatch(registration).execute("phase19-ac3", {
					ref: FIXTURE_PATH,
					question: "What does the speaker say?",
					budget: 1,
					resolution: "low",
				}),
			);
			if (result.details.tier !== 1 || result.details.transcriptSource !== "whisper") {
				throw new Error(
					"Live local ASR did not reach tier 1. Check mlx_whisper, model access, and bounded overrides in docs/LOCAL-ASR-SETUP.md.",
				);
			}

			const text = transcriptText(result);
			for (const word of manifest.evidenceWords) {
				expect(text.toLowerCase()).toMatch(new RegExp(`\\b${word}\\b`, "i"));
			}
			const timestamps = [...text.matchAll(/^(\d{2}(?::\d{2}){1,2}) → /gm)].map((match) =>
				timestampSeconds(match[1]!),
			);
			expect(timestamps.length).toBeGreaterThan(0);
			expect(timestamps.every(Number.isFinite)).toBe(true);
			expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
			expect(timestamps.every((value) => value >= 0 && value * 1000 <= manifest.media.maxDurationMs)).toBe(
				true,
			);
		},
		600_000,
	);
});
