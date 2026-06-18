/**
 * watched-frame-set.ts — the pi-watch "watched frame set" data contract.
 *
 * This is the load-bearing seam every tier (1 transcript / 2 native video /
 * 3 frames-into-context) plugs into (DESIGN.md §6). It is the tier-NEUTRAL,
 * in-memory representation the sampler produces and every tier consumes, on
 * ONE shared timeline:
 *   - ordered frames (base64 image + resolution tier + mm:ss + origin)
 *   - aligned transcript segments
 *   - source metadata (duration, fps sampled, frame count, transcript source)
 *
 * No OpenAI/model-specific shapes live here — serialization to the OpenAI
 * `content[]` wire shape is a separate pure transform (see serialize.ts).
 *
 * Each shape is defined once as a TypeBox schema, yielding both a static type
 * (via `Static<>`) and a runtime validator. Structural cross-field invariants
 * (ordering, counts, time monotonicity) are enforced by `validateWatchedFrameSet`,
 * which is a pure function.
 */

import { Type, type Static } from "typebox";
import { Value } from "typebox/value";

// ── Enumerations ────────────────────────────────────────────────────────────

export const ResolutionTier = Type.Union(
	[Type.Literal("low"), Type.Literal("high")],
	{
		$id: "ResolutionTier",
		description:
			"Frame resolution policy: 'low' by default; 'high' only for on-screen-text (OCR-ish) questions.",
	},
);
export type ResolutionTier = Static<typeof ResolutionTier>;

export const FrameOrigin = Type.Union(
	[Type.Literal("scene-cut"), Type.Literal("backfill")],
	{
		$id: "FrameOrigin",
		description:
			"How the frame was selected: 'scene-cut' (ffmpeg scene change) or 'backfill' (uniform gap fill).",
	},
);
export type FrameOrigin = Static<typeof FrameOrigin>;

export const TranscriptSource = Type.Union(
	[Type.Literal("captions"), Type.Literal("whisper")],
	{
		$id: "TranscriptSource",
		description:
			"Origin of transcript text: 'captions' (yt-dlp captions) or 'whisper' (local ASR).",
	},
);
export type TranscriptSource = Static<typeof TranscriptSource>;

export const MediaType = Type.Union(
	[Type.Literal("image/png"), Type.Literal("image/jpeg")],
	{
		$id: "MediaType",
		description: "Image encoding of the frame's base64 payload.",
	},
);
export type MediaType = Static<typeof MediaType>;

// ── Core shapes ─────────────────────────────────────────────────────────────

export const WatchedFrame = Type.Object(
	{
		index: Type.Integer({
			minimum: 0,
			description: "Zero-based position of this frame within the timeline.",
		}),
		tMs: Type.Integer({
			minimum: 0,
			description: "Canonical timeline offset of the frame, in milliseconds.",
		}),
		timestamp: Type.String({
			description:
				"Human-readable mm:ss (or h:mm:ss) display offset, derived from tMs.",
		}),
		imageBase64: Type.String({
			minLength: 1,
			description: "Base64-encoded image payload (no data: URL prefix).",
		}),
		mediaType: MediaType,
		resolution: ResolutionTier,
		origin: FrameOrigin,
	},
	{ $id: "WatchedFrame", additionalProperties: false },
);
export type WatchedFrame = Static<typeof WatchedFrame>;

export const TranscriptSegment = Type.Object(
	{
		startMs: Type.Integer({
			minimum: 0,
			description: "Segment start offset on the shared timeline, in milliseconds.",
		}),
		endMs: Type.Integer({
			minimum: 0,
			description:
				"Segment end offset on the shared timeline, in milliseconds (>= startMs).",
		}),
		text: Type.String({ description: "Transcript text for this segment." }),
		source: TranscriptSource,
	},
	{ $id: "TranscriptSegment", additionalProperties: false },
);
export type TranscriptSegment = Static<typeof TranscriptSegment>;

export const SourceMetadata = Type.Object(
	{
		ref: Type.String({
			minLength: 1,
			description: "Original video reference (local file path or URL).",
		}),
		durationMs: Type.Integer({
			minimum: 0,
			description: "Total source duration in milliseconds.",
		}),
		fpsSampled: Type.Number({
			exclusiveMinimum: 0,
			description: "Effective frames-per-second the sampler captured.",
		}),
		frameCount: Type.Integer({
			minimum: 0,
			description: "Number of frames in the set (must equal frames.length).",
		}),
		transcriptSource: Type.Union(
			[TranscriptSource, Type.Literal("none")],
			{ description: "Transcript origin, or 'none' if no transcript is present." },
		),
	},
	{ $id: "SourceMetadata", additionalProperties: false },
);
export type SourceMetadata = Static<typeof SourceMetadata>;

export const WatchedFrameSet = Type.Object(
	{
		source: SourceMetadata,
		frames: Type.Array(WatchedFrame, {
			description: "Frames ordered by tMs ascending.",
		}),
		transcript: Type.Array(TranscriptSegment, {
			description: "Transcript segments ordered by startMs ascending.",
		}),
	},
	{ $id: "WatchedFrameSet", additionalProperties: false },
);
export type WatchedFrameSet = Static<typeof WatchedFrameSet>;

// ── Validation ──────────────────────────────────────────────────────────────

export type ValidationResult =
	| { ok: true; value: WatchedFrameSet }
	| { ok: false; errors: string[] };

/**
 * Pure validator for a candidate WatchedFrameSet.
 *
 * Runs the TypeBox schema check, then enforces the structural cross-field
 * invariants the schema alone cannot express:
 *   - frames ordered by tMs ascending
 *   - transcript ordered by startMs ascending
 *   - each transcript segment has endMs >= startMs
 *   - source.frameCount === frames.length
 *
 * No I/O, no mutation of the input.
 */
export function validateWatchedFrameSet(value: unknown): ValidationResult {
	const errors: string[] = [];

	if (!Value.Check(WatchedFrameSet, value)) {
		for (const e of Value.Errors(WatchedFrameSet, value)) {
			errors.push(`${e.instancePath || "/"}: ${e.message}`);
		}
		return { ok: false, errors };
	}

	// Schema passed → `value` is structurally a WatchedFrameSet.
	const set = value as WatchedFrameSet;

	// frames ordered by tMs ascending
	for (let i = 1; i < set.frames.length; i++) {
		const prev = set.frames[i - 1]!;
		const cur = set.frames[i]!;
		if (cur.tMs < prev.tMs) {
			errors.push(
				`frames: not ordered by tMs ascending at index ${i} (${cur.tMs} < ${prev.tMs}).`,
			);
		}
	}

	// transcript ordered by startMs ascending + endMs >= startMs
	for (let i = 0; i < set.transcript.length; i++) {
		const seg = set.transcript[i]!;
		if (seg.endMs < seg.startMs) {
			errors.push(
				`transcript[${i}]: endMs (${seg.endMs}) < startMs (${seg.startMs}).`,
			);
		}
		if (i > 0) {
			const prev = set.transcript[i - 1]!;
			if (seg.startMs < prev.startMs) {
				errors.push(
					`transcript: not ordered by startMs ascending at index ${i} (${seg.startMs} < ${prev.startMs}).`,
				);
			}
		}
	}

	// frameCount consistency
	if (set.source.frameCount !== set.frames.length) {
		errors.push(
			`source.frameCount (${set.source.frameCount}) !== frames.length (${set.frames.length}).`,
		);
	}

	if (errors.length > 0) {
		return { ok: false, errors };
	}
	return { ok: true, value: set };
}
