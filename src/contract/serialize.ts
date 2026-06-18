/**
 * serialize.ts — pure serialization of a WatchedFrameSet to the OpenAI
 * `/v1/chat/completions` `content[]` wire shape.
 *
 * This is the serialization TARGET proven by both spikes (DESIGN.md §5):
 * ordered base64 image blocks + interleaved text, in OpenAI `content[]` shape.
 * It is a pure data transform — NO network calls, NO model invocation. Tiers 2
 * and 3 both ultimately feed this shape (local Qwen via mlx_vlm.server, or the
 * orchestrator model). Keeping it here keeps the core contract tier-neutral.
 */

import type { WatchedFrameSet, WatchedFrame, TranscriptSegment } from "./watched-frame-set.js";

// ── OpenAI content[] wire shapes ─────────────────────────────────────────────

export interface OpenAITextPart {
	type: "text";
	text: string;
}

export interface OpenAIImagePart {
	type: "image_url";
	image_url: { url: string };
}

export type OpenAIContentPart = OpenAITextPart | OpenAIImagePart;

export interface SerializeOptions {
	/**
	 * Whether to interleave transcript segments into the timeline as text parts.
	 * Default: true.
	 */
	includeTranscript?: boolean;
	/**
	 * Optional leading text part (e.g. a header describing the timeline).
	 * Omitted when not provided.
	 */
	header?: string;
}

/** Internal: a timeline event tagged for stable ordering. */
type TimelineEvent =
	| { at: number; kind: "frame"; order: 0; frame: WatchedFrame }
	| { at: number; kind: "transcript"; order: 1; segment: TranscriptSegment };

function dataUrl(frame: WatchedFrame): string {
	return `data:${frame.mediaType};base64,${frame.imageBase64}`;
}

/**
 * Serialize a WatchedFrameSet into an ordered OpenAI `content[]` array.
 *
 * Ordering: by timeline offset (frame.tMs / segment.startMs) ascending. When a
 * frame and a transcript segment share the same offset, the frame is emitted
 * first (order 0) so its mm:ss label and image precede the spoken text. Each
 * frame contributes a text part carrying its mm:ss timestamp immediately
 * followed by its image part (adjacency), so a downstream model sees the label
 * next to the picture.
 *
 * Pure: depends only on its arguments; no I/O, no mutation of the input.
 */
export function toOpenAIContent(
	set: WatchedFrameSet,
	opts: SerializeOptions = {},
): OpenAIContentPart[] {
	const includeTranscript = opts.includeTranscript ?? true;

	const events: TimelineEvent[] = [];
	for (const frame of set.frames) {
		events.push({ at: frame.tMs, kind: "frame", order: 0, frame });
	}
	if (includeTranscript) {
		for (const segment of set.transcript) {
			events.push({ at: segment.startMs, kind: "transcript", order: 1, segment });
		}
	}

	// Stable sort by (offset, kind-order). Array.prototype.sort is stable in
	// modern V8, so equal keys preserve insertion order (frames then transcript
	// in the order they appear in the set).
	events.sort((a, b) => (a.at - b.at) || (a.order - b.order));

	const parts: OpenAIContentPart[] = [];
	if (opts.header !== undefined) {
		parts.push({ type: "text", text: opts.header });
	}

	for (const ev of events) {
		if (ev.kind === "frame") {
			parts.push({ type: "text", text: `[${ev.frame.timestamp}]` });
			parts.push({ type: "image_url", image_url: { url: dataUrl(ev.frame) } });
		} else {
			parts.push({
				type: "text",
				text: `[${formatMs(ev.segment.startMs)}] ${ev.segment.text}`,
			});
		}
	}

	return parts;
}

/** Format a millisecond offset as mm:ss (or h:mm:ss past one hour). */
function formatMs(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const pad = (n: number) => String(n).padStart(2, "0");
	if (hours > 0) {
		return `${hours}:${pad(minutes)}:${pad(seconds)}`;
	}
	return `${pad(minutes)}:${pad(seconds)}`;
}
