import { ApiError } from "../errors";
import { request } from "../client";
import { endpoints } from "../registry";
import { validateUpload } from "../upload-rules";
import { presignUploadResponseSchema, type UploadKind } from "../schemas";

const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * Presign, then PUT the bytes straight to storage. Returns the storage key
 * that POST /v1/incidents expects as photoKey / audioKey.
 */
export async function uploadFile(input: {
  /** A file/blob/data URI to read, or the bytes themselves. */
  uri?: string | undefined;
  blob?: Blob | undefined;
  kind: UploadKind;
  contentType: string;
}): Promise<string> {
  let blob: Blob;
  try {
    blob = input.blob ?? (await (await fetch(input.uri as string)).blob());
  } catch {
    throw new ApiError({
      status: 0,
      code: "FILE_UNREADABLE",
      message: "Could not read the file",
      kind: "unknown",
    });
  }

  const problem = validateUpload({
    kind: input.kind,
    contentType: input.contentType,
    sizeBytes: blob.size,
  });
  if (problem) {
    throw new ApiError({
      status: 400,
      code: "VALIDATION_FAILED",
      message: problem,
      kind: "validation",
    });
  }

  const presign = await request({
    endpoint: endpoints.presignUpload,
    body: { kind: input.kind, contentType: input.contentType, sizeBytes: blob.size },
    schema: presignUploadResponseSchema,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(presign.uploadUrl, {
      method: presign.method,
      headers: presign.headers,
      body: blob,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ApiError({
        status: response.status,
        code: "UPLOAD_FAILED",
        message: "The file could not be uploaded",
        kind: "server",
      });
    }
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Upload failed",
      kind: "network",
    });
  } finally {
    clearTimeout(timer);
  }
  return presign.key;
}
