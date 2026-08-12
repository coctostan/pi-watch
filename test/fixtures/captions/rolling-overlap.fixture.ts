import type { TranscriptSegment } from "../../../src/contract/index.js";

export const rollingOverlapVtt = [
	"WEBVTT - synthetic rolling captions",
	"",
	"cue-1",
	"00:00:00.000 --> 00:00:04.000",
	"Welcome to café déjà vu",
	"",
	"cue-2",
	"00:00:02.000 --> 00:00:06.000",
	"<v Narrator><b>café</b> déjà <00:00:03.000>vu today we begin</v>",
	"",
	"cue-3",
	"00:00:04.000 --> 00:00:08.000",
	"today we begin with clear examples",
	"",
	"cue-4",
	"00:00:06.000 --> 00:00:09.000",
	"today we begin with clear examples",
	"",
	"cue-5",
	"00:00:08.000 --> 00:00:11.000",
	"clear examples stay intact",
	"",
	"cue-6",
	"00:00:10.000 --> 00:00:13.000",
	"intact through one token",
	"",
	"cue-7",
	"00:00:12.000 --> 00:00:15.000",
	"token, punctuation stays exact",
	"",
	"cue-8",
	"00:00:14.000 --> 00:00:17.000",
	"Punctuation stays exact in Case",
	"",
	"cue-9",
	"00:00:18.000 --> 00:00:21.000",
	"Punctuation stays exact in Case",
	"",
	"cue-10",
	"00:00:19.000 --> 00:00:22.000",
	"Welcome to café déjà vu",
	"",
].join("\n");

export const rollingOverlapRawSegments: readonly TranscriptSegment[] = [
	{ startMs: 0, endMs: 4_000, text: "Welcome to café déjà vu", source: "captions" },
	{ startMs: 2_000, endMs: 6_000, text: "café déjà vu today we begin", source: "captions" },
	{ startMs: 4_000, endMs: 8_000, text: "today we begin with clear examples", source: "captions" },
	{ startMs: 6_000, endMs: 9_000, text: "today we begin with clear examples", source: "captions" },
	{ startMs: 8_000, endMs: 11_000, text: "clear examples stay intact", source: "captions" },
	{ startMs: 10_000, endMs: 13_000, text: "intact through one token", source: "captions" },
	{ startMs: 12_000, endMs: 15_000, text: "token, punctuation stays exact", source: "captions" },
	{ startMs: 14_000, endMs: 17_000, text: "Punctuation stays exact in Case", source: "captions" },
	{ startMs: 18_000, endMs: 21_000, text: "Punctuation stays exact in Case", source: "captions" },
	{ startMs: 19_000, endMs: 22_000, text: "Welcome to café déjà vu", source: "captions" },
];

export const rollingOverlapExpectedSegments: readonly TranscriptSegment[] = [
	{ startMs: 0, endMs: 4_000, text: "Welcome to café déjà vu", source: "captions" },
	{ startMs: 2_000, endMs: 6_000, text: "today we begin", source: "captions" },
	{ startMs: 4_000, endMs: 8_000, text: "with clear examples", source: "captions" },
	{ startMs: 8_000, endMs: 11_000, text: "clear examples stay intact", source: "captions" },
	{ startMs: 10_000, endMs: 13_000, text: "intact through one token", source: "captions" },
	{ startMs: 12_000, endMs: 15_000, text: "token, punctuation stays exact", source: "captions" },
	{ startMs: 14_000, endMs: 17_000, text: "Punctuation stays exact in Case", source: "captions" },
	{ startMs: 18_000, endMs: 21_000, text: "Punctuation stays exact in Case", source: "captions" },
	{ startMs: 19_000, endMs: 22_000, text: "Welcome to café déjà vu", source: "captions" },
];

export const knownRollingOverlapPrefixes = [
	{ startMs: 2_000, tokens: ["café", "déjà", "vu"] },
	{ startMs: 4_000, tokens: ["today", "we", "begin"] },
	{ startMs: 6_000, tokens: ["today", "we", "begin", "with", "clear", "examples"] },
] as const;

export const rollingOverlapMetrics = {
	rawTranscriptBytes: 301,
	normalizedTranscriptBytes: 235,
	rawKnownDuplicateTokens: 12,
	normalizedKnownDuplicateTokens: 0,
} as const;
