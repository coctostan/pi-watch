/**
 * pi-watch data contract — public surface.
 *
 * The tier-neutral "watched frame set" type family + pure validator, and the
 * pure serializer to the OpenAI `content[]` wire shape.
 */
export { ResolutionTier, FrameOrigin, TranscriptSource, MediaType, WatchedFrame, TranscriptSegment, SourceMetadata, WatchedFrameSet, validateWatchedFrameSet, } from "./watched-frame-set.js";
export { toOpenAIContent, } from "./serialize.js";
//# sourceMappingURL=index.js.map