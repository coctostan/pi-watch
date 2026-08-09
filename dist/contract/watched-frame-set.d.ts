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
export declare const ResolutionTier: Type.TUnion<[Type.TLiteral<"low">, Type.TLiteral<"high">]>;
export type ResolutionTier = Static<typeof ResolutionTier>;
export declare const FrameOrigin: Type.TUnion<[Type.TLiteral<"scene-cut">, Type.TLiteral<"backfill">]>;
export type FrameOrigin = Static<typeof FrameOrigin>;
export declare const TranscriptSource: Type.TUnion<[Type.TLiteral<"captions">, Type.TLiteral<"whisper">]>;
export type TranscriptSource = Static<typeof TranscriptSource>;
export declare const MediaType: Type.TUnion<[Type.TLiteral<"image/png">, Type.TLiteral<"image/jpeg">]>;
export type MediaType = Static<typeof MediaType>;
export declare const WatchedFrame: Type.TObject<{
    index: Type.TInteger;
    tMs: Type.TInteger;
    timestamp: Type.TString;
    imageBase64: Type.TString;
    mediaType: Type.TUnion<[Type.TLiteral<"image/png">, Type.TLiteral<"image/jpeg">]>;
    resolution: Type.TUnion<[Type.TLiteral<"low">, Type.TLiteral<"high">]>;
    origin: Type.TUnion<[Type.TLiteral<"scene-cut">, Type.TLiteral<"backfill">]>;
}>;
export type WatchedFrame = Static<typeof WatchedFrame>;
export declare const TranscriptSegment: Type.TObject<{
    startMs: Type.TInteger;
    endMs: Type.TInteger;
    text: Type.TString;
    source: Type.TUnion<[Type.TLiteral<"captions">, Type.TLiteral<"whisper">]>;
}>;
export type TranscriptSegment = Static<typeof TranscriptSegment>;
export declare const SourceMetadata: Type.TObject<{
    ref: Type.TString;
    durationMs: Type.TInteger;
    fpsSampled: Type.TNumber;
    frameCount: Type.TInteger;
    transcriptSource: Type.TUnion<[Type.TUnion<[Type.TLiteral<"captions">, Type.TLiteral<"whisper">]>, Type.TLiteral<"none">]>;
}>;
export type SourceMetadata = Static<typeof SourceMetadata>;
export declare const WatchedFrameSet: Type.TObject<{
    source: Type.TObject<{
        ref: Type.TString;
        durationMs: Type.TInteger;
        fpsSampled: Type.TNumber;
        frameCount: Type.TInteger;
        transcriptSource: Type.TUnion<[Type.TUnion<[Type.TLiteral<"captions">, Type.TLiteral<"whisper">]>, Type.TLiteral<"none">]>;
    }>;
    frames: Type.TArray<Type.TObject<{
        index: Type.TInteger;
        tMs: Type.TInteger;
        timestamp: Type.TString;
        imageBase64: Type.TString;
        mediaType: Type.TUnion<[Type.TLiteral<"image/png">, Type.TLiteral<"image/jpeg">]>;
        resolution: Type.TUnion<[Type.TLiteral<"low">, Type.TLiteral<"high">]>;
        origin: Type.TUnion<[Type.TLiteral<"scene-cut">, Type.TLiteral<"backfill">]>;
    }>>;
    transcript: Type.TArray<Type.TObject<{
        startMs: Type.TInteger;
        endMs: Type.TInteger;
        text: Type.TString;
        source: Type.TUnion<[Type.TLiteral<"captions">, Type.TLiteral<"whisper">]>;
    }>>;
}>;
export type WatchedFrameSet = Static<typeof WatchedFrameSet>;
export type ValidationResult = {
    ok: true;
    value: WatchedFrameSet;
} | {
    ok: false;
    errors: string[];
};
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
export declare function validateWatchedFrameSet(value: unknown): ValidationResult;
//# sourceMappingURL=watched-frame-set.d.ts.map