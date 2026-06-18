import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sample } from "../../src/sampler/index.js";
import { validateWatchedFrameSet } from "../../src/contract/index.js";

/**
 * Golden-clip round-trip: synthesize a deterministic clip at test time via
 * ffmpeg `lavfi` (no committed binary — local-first), run the full
 * effect → pure-core chain through `sample()`, and assert the result is a
 * contract-valid `WatchedFrameSet`.
 *
 * The clip concatenates three solid-color segments (red/green/blue, 1s each at
 * 10fps) so real scene cuts exist for ffmpeg to find.
 */

const execFileAsync = promisify(execFile);

/** Is `bin` runnable? Used to skip gracefully where ffmpeg/ffprobe are absent. */
async function hasBinary(bin: string): Promise<boolean> {
	try {
		await execFileAsync(bin, ["-version"], { timeout: 10_000 });
		return true;
	} catch {
		return false;
	}
}

let tmpDir: string;
let clipPath: string;
let toolsAvailable = false;

beforeAll(async () => {
	toolsAvailable = (await hasBinary("ffmpeg")) && (await hasBinary("ffprobe"));
	if (!toolsAvailable) return;

	tmpDir = await mkdtemp(join(tmpdir(), "pi-watch-sample-"));
	const colors = ["red", "green", "blue"];
	const segPaths: string[] = [];
	for (let i = 0; i < colors.length; i++) {
		const segPath = join(tmpDir, `seg${i}.mp4`);
		await execFileAsync(
			"ffmpeg",
			[
				"-y",
				"-loglevel",
				"error",
				"-f",
				"lavfi",
				"-i",
				`color=c=${colors[i]}:size=128x128:duration=1:rate=10`,
				segPath,
			],
			{ timeout: 30_000 },
		);
		segPaths.push(segPath);
	}
	const listPath = join(tmpDir, "list.txt");
	await writeFile(listPath, segPaths.map((p) => `file '${p}'`).join("\n"), "utf8");
	clipPath = join(tmpDir, "clip.mp4");
	await execFileAsync(
		"ffmpeg",
		["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", clipPath],
		{ timeout: 30_000 },
	);
}, 60_000);

afterAll(async () => {
	if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
});

describe("sample() golden-clip round-trip (AC-3/AC-4/AC-5)", () => {
	it("produces a contract-valid WatchedFrameSet within budget", async (ctx) => {
		if (!toolsAvailable) {
			ctx.skip();
			return;
		}

		const budget = 8;
		const result = await sample({ ref: clipPath, budget });

		// AC-4: the real acceptance signal.
		const validation = validateWatchedFrameSet(result);
		expect(validation.ok).toBe(true);

		// Budget + non-empty.
		expect(result.frames.length).toBeLessThanOrEqual(budget);
		expect(result.frames.length).toBeGreaterThanOrEqual(1);

		// Sequential zero-based indices, tMs-ascending, mm:ss timestamps.
		result.frames.forEach((f, i) => {
			expect(f.index).toBe(i);
			expect(f.timestamp).toMatch(/^(\d+:)?\d{2}:\d{2}$/);
			if (i > 0) expect(f.tMs).toBeGreaterThan(result.frames[i - 1]!.tMs);
		});

		// AC-3: each frame carries a real base64 payload (no data: prefix).
		for (const f of result.frames) {
			expect(f.imageBase64.length).toBeGreaterThan(0);
			expect(f.imageBase64.startsWith("data:")).toBe(false);
			expect(f.mediaType).toBe("image/png");
		}

		// Source metadata wiring.
		expect(result.source.frameCount).toBe(result.frames.length);
		expect(result.source.ref).toBe(clipPath);
		expect(result.source.durationMs).toBeGreaterThan(0);

		// AC-5: local clip → best-effort transcript degrades to "none".
		expect(result.source.transcriptSource).toBe("none");
		expect(result.transcript).toEqual([]);
	}, 30_000);

	it("enforces a smaller budget on the same clip", async (ctx) => {
		if (!toolsAvailable) {
			ctx.skip();
			return;
		}
		const result = await sample({ ref: clipPath, budget: 3 });
		expect(validateWatchedFrameSet(result).ok).toBe(true);
		expect(result.frames.length).toBeLessThanOrEqual(3);
	}, 30_000);
});
