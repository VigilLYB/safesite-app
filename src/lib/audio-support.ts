/**
 * Android can only record AAC (.m4a) through expo-audio: no WAV, no OGG/Opus. The recorder is
 * ready for it, but POST /v1/uploads still rejects audio/mp4, so it stays off until the backend
 * accepts m4a (backend: adapters/storage/media-types.js, and a transcoding or batch step, since
 * Transcribe Streaming can't read AAC). Flip this to true in the same change.
 */
export const SERVER_ACCEPTS_M4A = false;

export const M4A_CONTENT_TYPE = "audio/mp4";
