import { Platform } from "react-native";
import { File, UploadType } from "expo-file-system";
import { ApiError } from "../errors";
import { request } from "../client";
import { endpoints } from "../registry";
import { validateUpload } from "../upload-rules";
import { presignUploadResponseSchema, type UploadKind } from "../schemas";

const UPLOAD_TIMEOUT_MS = 60_000;

/** Bytes to send, and how to PUT them to a presigned URL. */
interface UploadSource {
  size: number;
  /** Resolves with the HTTP status of the PUT. */
  put: (url: string, method: string, headers: Record<string, string>) => Promise<number>;
}

const unreadable = () =>
  new ApiError({
    status: 0,
    code: "FILE_UNREADABLE",
    message: "Could not read the file",
    kind: "unknown",
  });

/**
 * On a device, a camera or recorder file is uploaded natively from its path. React Native's
 * `fetch` with a Blob body does not send the bytes on Android (S3 stored a 14-byte placeholder
 * instead of the photo), so device files never go through it. A static import, not a dynamic one:
 * under Expo Go, a dynamic import can fetch its chunk over the same wifi link as the Metro dev
 * server, so testing "offline" by turning wifi off also broke this import and got misreported as
 * an unreadable file, nothing to do with the photo or the network call this is actually testing.
 */
async function nativeFileSource(uri: string): Promise<UploadSource> {
  const file = new File(uri);
  if (!file.exists) throw unreadable();
  return {
    size: file.size,
    put: async (url, method, headers) => {
      const result = await file.upload(url, {
        httpMethod: method === "POST" || method === "PATCH" ? method : "PUT",
        uploadType: UploadType.BINARY_CONTENT,
        headers,
      });
      return result.status;
    },
  };
}

/** Web, data: URIs and in-memory blobs: a normal fetch PUT with the Blob body. */
function blobSource(blob: Blob): UploadSource {
  return {
    size: blob.size,
    put: async (url, method, headers) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: blob,
          signal: controller.signal,
        });
        return response.status;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

const isDeviceFile = (uri: string): boolean =>
  Platform.OS !== "web" && /^(file|content):\/\//.test(uri);

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
  let source: UploadSource;
  try {
    if (input.blob) source = blobSource(input.blob);
    else if (!input.uri) throw unreadable();
    else if (isDeviceFile(input.uri)) source = await nativeFileSource(input.uri);
    else source = blobSource(await (await fetch(input.uri)).blob());
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    throw unreadable();
  }

  const problem = validateUpload({
    kind: input.kind,
    contentType: input.contentType,
    sizeBytes: source.size,
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
    body: { kind: input.kind, contentType: input.contentType, sizeBytes: source.size },
    schema: presignUploadResponseSchema,
  });

  let status: number;
  try {
    status = await source.put(presign.uploadUrl, presign.method, presign.headers);
  } catch {
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Upload failed",
      kind: "network",
    });
  }
  if (status < 200 || status >= 300) {
    throw new ApiError({
      status,
      code: "UPLOAD_FAILED",
      message: "The file could not be uploaded",
      kind: "server",
    });
  }
  return presign.key;
}
