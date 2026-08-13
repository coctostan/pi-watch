import { describe, it, expect } from "vitest";
import {
	parseWatchCommand,
	buildWatchPrompt,
	runWatchCommand,
	WATCH_COMMAND_USAGE,
	type WatchCommandEffects,
} from "../../src/watch/index.js";

/**
 * Deterministic specs for the `/watch` command pure core (Phase 8, AC-1 + AC-2).
 * No pi runtime: the parser/prompt-builder are pure, and `runWatchCommand` is
 * exercised with stub effects that capture their calls (mirrors the tier-2
 * adapter's injected-`fetchImpl` test convention).
 */

/** Build a stub effects pair that records every notify/send call. */
function stubEffects(): {
	effects: WatchCommandEffects;
	notifies: Array<{ message: string; level: "info" | "warning" | "error" }>;
	sends: string[];
} {
	const notifies: Array<{ message: string; level: "info" | "warning" | "error" }> = [];
	const sends: string[] = [];
	return {
		notifies,
		sends,
		effects: {
			notify: (message, level) => notifies.push({ message, level }),
			send: (content) => sends.push(content),
		},
	};
}

describe("parseWatchCommand — valid input", () => {
	it("splits the first token as ref and the rest as question", () => {
		const parsed = parseWatchCommand("clip.mp4 What happens at the end?");
		expect(parsed).toEqual({
			ok: true,
			ref: "clip.mp4",
			question: "What happens at the end?",
		});
	});

	it("accepts an http(s) URL ref", () => {
		const parsed = parseWatchCommand("https://example.com/v.mp4 who speaks first?");
		expect(parsed).toEqual({
			ok: true,
			ref: "https://example.com/v.mp4",
			question: "who speaks first?",
		});
	});

	it("trims surrounding and extra interior whitespace around the split", () => {
		const parsed = parseWatchCommand("   clip.mp4    describe the scene   ");
		expect(parsed).toEqual({
			ok: true,
			ref: "clip.mp4",
			question: "describe the scene",
		});
	});

	it("keeps a multi-word question intact", () => {
		const parsed = parseWatchCommand("a.mov what color is the car and when does it turn");
		expect(parsed.ok).toBe(true);
		if (parsed.ok) {
			expect(parsed.ref).toBe("a.mov");
			expect(parsed.question).toBe("what color is the car and when does it turn");
		}
	});
});

describe("[phase23][R8] parseWatchCommand — narrow quoted refs", () => {
	it.each([
		["'/Users/me/My Videos/demo clip.mov' What happens next?", "/Users/me/My Videos/demo clip.mov"],
		['"/Users/me/My Videos/demo clip.mov" What happens next?', "/Users/me/My Videos/demo clip.mov"],
		["  '/tmp/two  spaces.mov'   What happens next?  ", "/tmp/two  spaces.mov"],
	])("strips one matching quote pair and preserves the complete ref: %s", (args, ref) => {
		expect(parseWatchCommand(args)).toEqual({
			ok: true,
			ref,
			question: "What happens next?",
		});
	});

	it("leaves legacy unquoted refs unchanged", () => {
		expect(parseWatchCommand("clip.mp4 What happens next?")).toEqual({
			ok: true,
			ref: "clip.mp4",
			question: "What happens next?",
		});
	});

	it.each([
		"'' What happens next?",
		'"" What happens next?',
		"'/tmp/missing close.mov What happens next?",
		'"/tmp/missing close.mov What happens next?',
		"'/tmp/clip.mov'",
		'"/tmp/clip.mov"',
		"'/tmp/clip.mov'x What happens next?",
		'"/tmp/clip.mov"x What happens next?',
		'"/tmp/clip\\"name.mov" What happens next?',
	])("rejects malformed or shell-like quoted input: %s", (args) => {
		expect(parseWatchCommand(args)).toEqual({ ok: false, usage: WATCH_COMMAND_USAGE });
	});

	it("delegates a quoted local ref with spaces without interpreting its contents", () => {
		const { effects, notifies, sends } = stubEffects();
		runWatchCommand("'$HOME/My Videos/demo.mov' What happens?", effects);

		expect(sends).toEqual([
			buildWatchPrompt("$HOME/My Videos/demo.mov", "What happens?"),
		]);
		expect(notifies).toEqual([]);
	});
});

describe("parseWatchCommand — invalid input", () => {
	it("rejects empty input with the usage string", () => {
		expect(parseWatchCommand("")).toEqual({ ok: false, usage: WATCH_COMMAND_USAGE });
	});

	it("rejects whitespace-only input with the usage string", () => {
		expect(parseWatchCommand("    \t  ")).toEqual({ ok: false, usage: WATCH_COMMAND_USAGE });
	});

	it("rejects a bare ref with no question", () => {
		expect(parseWatchCommand("clip.mp4")).toEqual({ ok: false, usage: WATCH_COMMAND_USAGE });
	});

	it("rejects a ref followed only by whitespace", () => {
		expect(parseWatchCommand("clip.mp4    ")).toEqual({ ok: false, usage: WATCH_COMMAND_USAGE });
	});
});

describe("buildWatchPrompt", () => {
	it("embeds the ref and question verbatim and points at the watch tool", () => {
		const prompt = buildWatchPrompt("clip.mp4", "what happens?");
		expect(prompt).toContain("clip.mp4");
		expect(prompt).toContain("what happens?");
		expect(prompt).toContain("watch tool");
	});
});

describe("runWatchCommand", () => {
	it("sends the agent-steering prompt exactly once on valid input and never error-notifies", () => {
		const { effects, notifies, sends } = stubEffects();
		runWatchCommand("clip.mp4 what happens at the end?", effects);

		expect(sends).toHaveLength(1);
		expect(sends[0]).toBe(buildWatchPrompt("clip.mp4", "what happens at the end?"));
		expect(notifies).toHaveLength(0);
	});

	it("notifies the usage string at warning level and does not send on invalid input", () => {
		const { effects, notifies, sends } = stubEffects();
		runWatchCommand("clip.mp4", effects);

		expect(sends).toHaveLength(0);
		expect(notifies).toEqual([{ message: WATCH_COMMAND_USAGE, level: "warning" }]);
	});

	it("notifies usage on empty input and does not send", () => {
		const { effects, notifies, sends } = stubEffects();
		runWatchCommand("", effects);

		expect(sends).toHaveLength(0);
		expect(notifies).toEqual([{ message: WATCH_COMMAND_USAGE, level: "warning" }]);
	});
});
