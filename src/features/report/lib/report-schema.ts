import { z } from "zod";

export const detailsSchema = z.object({
  title: z.string().max(200, "Keep the title under 200 characters."),
  description: z.string().max(5000, "Keep the description under 5000 characters."),
  category: z.string().max(60),
});
export type ReportDetails = z.infer<typeof detailsSchema>;

/** The API allows an empty report, but a report nobody can act on helps nobody. */
export function hasContent(input: {
  photoUri: string | null;
  audioUri: string | null;
  title: string;
  description: string;
}): boolean {
  return Boolean(
    input.photoUri || input.audioUri || input.title.trim() || input.description.trim(),
  );
}

/** m4a (AAC) is what expo-audio's HIGH_QUALITY preset records on iOS and Android. */
export const AUDIO_CONTENT_TYPE = "audio/mp4";
export const PHOTO_CONTENT_TYPE = "image/jpeg";
