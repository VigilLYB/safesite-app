import { z } from "zod";

export const presignUploadResponseSchema = z.object({
  key: z.string(),
  uploadUrl: z.string(),
  method: z.literal("PUT"),
  headers: z.record(z.string(), z.string()),
  expiresInSeconds: z.number(),
});
export type PresignUploadResponse = z.infer<typeof presignUploadResponseSchema>;

export type UploadKind = "photo" | "audio" | "blueprint";
