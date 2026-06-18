/**
 * pi-watch data contract — public surface.
 *
 * The tier-neutral "watched frame set" type family + pure validator, and the
 * pure serializer to the OpenAI `content[]` wire shape.
 */

export {
	ResolutionTier,
	FrameOrigin,
	TranscriptSource,
	MediaType,
	WatchedFrame,
	TranscriptSegment,
	SourceMetadata,
	WatchedFrameSet,
	validateWatchedFrameSet,
	type ValidationResult,
} from "./watched-frame-set.js";

export {
	toOpenAIContent,
	type OpenAIContentPart,
	type OpenAITextPart,
	type OpenAIImagePart,
	type SerializeOptions,
} from "./serialize.js";
