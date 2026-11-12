/** Guide §2.6: PPE scanning needs 64–4096 px per side; uploads are JPEG or PNG up to 10 MB. */
export const PHOTO_MIN_SIDE = 64;
export const PHOTO_MAX_SIDE = 4096;
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export type PhotoPlan =
  | { ok: false; reason: string }
  | { ok: true; resize: { width: number } | { height: number } | null };

/**
 * Decide how to prepare a picked photo. We always re-encode to JPEG afterwards (strips EXIF,
 * turns HEIC/WebP into something the server accepts), so this only decides the downscale.
 */
export function planPhoto(input: { width: number; height: number }): PhotoPlan {
  const { width, height } = input;
  if (!(width > 0 && height > 0)) return { ok: false, reason: "Couldn't read that photo." };
  if (Math.min(width, height) < PHOTO_MIN_SIDE) {
    return {
      ok: false,
      reason: `That photo is too small. Use one at least ${PHOTO_MIN_SIDE} px wide.`,
    };
  }
  if (Math.max(width, height) <= PHOTO_MAX_SIDE) return { ok: true, resize: null };
  return width >= height
    ? { ok: true, resize: { width: PHOTO_MAX_SIDE } }
    : { ok: true, resize: { height: PHOTO_MAX_SIDE } };
}
