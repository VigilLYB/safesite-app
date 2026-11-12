import type { UploadKind } from "./schemas/upload";

/** Mirrors POST /v1/uploads on the backend (see frontend-page-guide §2.6). */
export const UPLOAD_RULES: Record<
  UploadKind,
  { maxBytes: number; contentTypes: readonly string[] }
> = {
  photo: { maxBytes: 10 * 1024 * 1024, contentTypes: ["image/jpeg", "image/png"] },
  audio: {
    maxBytes: 4 * 1024 * 1024,
    contentTypes: [
      "audio/wav",
      "audio/x-wav",
      "audio/wave",
      "audio/flac",
      "audio/ogg",
      "audio/opus",
    ],
  },
  blueprint: {
    maxBytes: 15 * 1024 * 1024,
    contentTypes: ["image/jpeg", "image/png", "image/svg+xml"],
  },
};

/** Returns a user-facing problem, or null when the file can be uploaded. */
export function validateUpload(input: {
  kind: UploadKind;
  contentType: string;
  sizeBytes: number;
}): string | null {
  const rule = UPLOAD_RULES[input.kind];
  if (!rule.contentTypes.includes(input.contentType.toLowerCase())) {
    return input.kind === "audio"
      ? "Voice notes must be WAV, FLAC or OGG/Opus. m4a, AAC and WebM are rejected."
      : "That file type is not supported.";
  }
  if (input.sizeBytes <= 0) return "The file is empty.";
  if (input.sizeBytes > rule.maxBytes) {
    return `The file is too large (max ${Math.round(rule.maxBytes / 1_048_576)} MB).`;
  }
  return null;
}
