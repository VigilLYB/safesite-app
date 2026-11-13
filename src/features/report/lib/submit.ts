import {
  ApiError,
  isApiError,
  type SubmitIncidentInput,
  type SubmitIncidentResponse,
  type UploadKind,
} from "@/lib/api";

/** A presigned URL lives 10 minutes; ask for a new one after 9 (guide §2.6). */
export const UPLOAD_FRESH_MS = 9 * 60_000;
export const RESEND_BACKOFF_MS = [1_000, 2_000] as const;

export interface UploadedKey {
  key: string;
  at: number;
}

export interface FileToSend {
  uri: string;
  contentType: string;
}

export interface SubmitDeps {
  upload: (input: { uri: string; kind: UploadKind; contentType: string }) => Promise<string>;
  submit: (body: SubmitIncidentInput) => Promise<SubmitIncidentResponse>;
  sleep: (ms: number) => Promise<void>;
  nowMs: () => number;
}

/** Network error, timeout, 502, 503, 504: the save may or may not have landed. Resend the same body. */
export function isAmbiguousFailure(error: unknown): boolean {
  if (!isApiError(error)) return false;
  return (
    error.kind === "network" ||
    error.kind === "timeout" ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504
  );
}

/** 422 "photo upload not found" / "audio upload not found": the PUT never landed or expired. */
export function missingUploadKind(error: unknown): "photo" | "audio" | null {
  if (!isApiError(error) || error.status !== 422) return null;
  if (/photo upload not found/i.test(error.message)) return "photo";
  if (/audio upload not found/i.test(error.message)) return "audio";
  return null;
}

export class SavedOnDevice extends Error {
  override readonly cause: unknown;
  constructor(cause: unknown) {
    super("Saved on this device");
    this.name = "SavedOnDevice";
    this.cause = cause;
  }
}

/**
 * Uploads (reusing fresh keys), then submits. The caller owns `clientSubmissionId` and passes the
 * same one on every retry. Ambiguous failures - of the upload or of the submit itself, e.g. no
 * signal - are resent twice with backoff; after that the report stays a draft on the device
 * (`SavedOnDevice`). A missing upload is re-uploaded and the same body is resent. The upload runs
 * inside the same retry loop as the submit: with no network at all, it never gets as far as a
 * submit attempt, so it must be covered by the same recovery path, not skip it.
 */
export async function submitWithRecovery(args: {
  photo: FileToSend | null;
  audio: FileToSend | null;
  cache: Map<string, UploadedKey>;
  build: (keys: {
    photoKey?: string | undefined;
    audioKey?: string | undefined;
  }) => SubmitIncidentInput;
  deps: SubmitDeps;
}): Promise<SubmitIncidentResponse> {
  const { photo, audio, cache, build, deps } = args;

  const keyFor = async (kind: "photo" | "audio", file: FileToSend | null, fresh = true) => {
    if (!file) return undefined;
    const cached = cache.get(file.uri);
    if (fresh && cached && deps.nowMs() - cached.at < UPLOAD_FRESH_MS) return cached.key;
    const key = await deps.upload({ uri: file.uri, kind, contentType: file.contentType });
    cache.set(file.uri, { key, at: deps.nowMs() });
    return key;
  };

  let photoKey: string | undefined;
  let audioKey: string | undefined;
  let reuploaded = false;
  /** Set when the server lost an upload: the next pass uploads that file again. */
  let forceFresh: "photo" | "audio" | null = null;

  for (let attempt = 0; ; attempt += 1) {
    try {
      // Inside the try: a re-upload that hits a dropped connection is saved like any other failure.
      photoKey = await keyFor("photo", photo, forceFresh !== "photo");
      audioKey = await keyFor("audio", audio, forceFresh !== "audio");
      forceFresh = null;
      return await deps.submit(build({ photoKey, audioKey }));
    } catch (error) {
      const missing = missingUploadKind(error);
      if (missing && !reuploaded) {
        reuploaded = true;
        forceFresh = missing;
        attempt -= 1; // a lost upload is not a connection failure: it does not use up a resend
        continue;
      }
      if (isAmbiguousFailure(error)) {
        const wait = RESEND_BACKOFF_MS[attempt];
        if (wait === undefined) throw new SavedOnDevice(error);
        await deps.sleep(wait);
        continue;
      }
      throw error instanceof ApiError || error instanceof Error
        ? error
        : new Error("Submit failed");
    }
  }
}
