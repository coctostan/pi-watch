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
import type { WatchedFrameSet } from "./watched-frame-set.js";
export interface OpenAITextPart {
    type: "text";
    text: string;
}
export interface OpenAIImagePart {
    type: "image_url";
    image_url: {
        url: string;
    };
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
export declare function toOpenAIContent(set: WatchedFrameSet, opts?: SerializeOptions): OpenAIContentPart[];
//# sourceMappingURL=serialize.d.ts.map