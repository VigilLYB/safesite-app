import { useEffect, useState } from "react";
import { offlineFiles, type OfflineFiles } from "./files";

/**
 * Floor-plan images kept on the device, so a pin can be placed on the plan with no connection.
 *
 * The API only gives a link to each image, and the link expires after an hour, so saving the
 * link (as the read cache does) is not enough: the image file itself is downloaded. Files are
 * named by the plan's `imageKey`; a plan given a new image gets a new key, so it is downloaded
 * again and the old file removed. Floor plans are plant data, not personal data, so they are
 * shared by everyone who signs in on the device.
 */
const DIR = "floor-plans";

/** imageKey -> local URI, so screens can draw the local copy on first render. */
const known = new Map<string, string>();

export interface FloorPlanImage {
  imageKey: string | null;
  imageUrl: string | null;
}

/**
 * Downloads every floor-plan image not yet on the device and deletes images no plan uses any
 * more. One failed download never stops the others. Returns how many were downloaded.
 */
export async function syncFloorPlanImages(
  plans: readonly FloorPlanImage[],
  files: OfflineFiles = offlineFiles,
): Promise<number> {
  const wanted = new Set<string>();
  let downloaded = 0;
  for (const plan of plans) {
    if (!plan.imageKey) continue;
    wanted.add(plan.imageKey);
    try {
      const existing = await files.uriOf([DIR, plan.imageKey]);
      if (existing) {
        known.set(plan.imageKey, existing);
        continue;
      }
      if (!plan.imageUrl) continue;
      known.set(plan.imageKey, await files.download(plan.imageUrl, [DIR, plan.imageKey]));
      downloaded += 1;
    } catch {
      // Lost connection or full disk: try again on the next sync.
    }
  }
  // Paths are stored with unsafe characters replaced, so compare in that form.
  const safeWanted = new Set([...wanted].map((key) => key.replace(/[^A-Za-z0-9._-]/g, "_")));
  for (const name of await files.list([DIR])) {
    if (!safeWanted.has(name) && !name.endsWith(".part")) await files.remove([DIR, name]);
  }
  for (const key of [...known.keys()]) if (!wanted.has(key)) known.delete(key);
  return downloaded;
}

/** The local copy if there is one, else null. */
export async function localFloorPlanImage(
  imageKey: string,
  files: OfflineFiles = offlineFiles,
): Promise<string | null> {
  const cached = known.get(imageKey);
  if (cached) return cached;
  try {
    const uri = await files.uriOf([DIR, imageKey]);
    if (uri) known.set(imageKey, uri);
    return uri;
  } catch {
    return null;
  }
}

/** Tests only. */
export function forgetFloorPlanImages(): void {
  known.clear();
}

/**
 * The image to draw: the copy on the device when there is one (it works offline and never
 * expires), otherwise the server's link.
 */
export function useFloorPlanImage(plan: {
  imageKey?: string | null | undefined;
  imageUrl: string | null;
}): string | null {
  const key = plan.imageKey ?? null;
  const [local, setLocal] = useState<{ key: string; uri: string } | null>(() =>
    key && known.has(key) ? { key, uri: known.get(key)! } : null,
  );
  useEffect(() => {
    if (!key) return;
    let active = true;
    void localFloorPlanImage(key).then((uri) => {
      if (active && uri) setLocal({ key, uri });
    });
    return () => {
      active = false;
    };
  }, [key]);
  if (key && local?.key === key) return local.uri;
  return plan.imageUrl;
}
