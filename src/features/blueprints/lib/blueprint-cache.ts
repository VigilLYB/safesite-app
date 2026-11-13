import { Directory, File, Paths } from "expo-file-system";
import type { BlueprintDetail } from "@/lib/api";

/**
 * Caches one blueprint (image + areas + geometry) on the device so the Worker can still see the
 * floor plan and drop a pin with no signal. One plant, one map: this only ever holds the most
 * recently viewed blueprint, not a library of them.
 */
const dir = () => new Directory(Paths.document, "blueprint-cache");
const metaFile = () => new File(dir(), "meta.json");

function imageExtension(url: string): string {
  try {
    const match = /\.(jpe?g|png|svg)(?=$|\?)/i.exec(new URL(url).pathname);
    return match ? match[0] : ".jpg";
  } catch {
    return ".jpg";
  }
}

/** Downloads and saves the given blueprint, replacing whatever was cached before. Best-effort. */
export async function cacheBlueprint(detail: BlueprintDetail): Promise<void> {
  if (!detail.imageUrl) return;
  try {
    const folder = dir();
    if (!folder.exists) folder.create({ intermediates: true });
    const imageFile = new File(folder, `image${imageExtension(detail.imageUrl)}`);
    await File.downloadFileAsync(detail.imageUrl, imageFile, { idempotent: true });
    await metaFile().write(
      JSON.stringify({ ...detail, imageUrl: null, localImage: imageFile.uri }),
    );
  } catch {
    // Best-effort cache: a failure here must never block the online flow that triggered it.
  }
}

/** The last blueprint saved by `cacheBlueprint`, with `imageUrl` pointing at the local copy. */
export async function getCachedBlueprint(): Promise<BlueprintDetail | null> {
  try {
    const file = metaFile();
    if (!file.exists) return null;
    const saved = JSON.parse(await file.text()) as BlueprintDetail & { localImage: string | null };
    if (saved.localImage && !new File(saved.localImage).exists) return null; // image was cleared
    return { ...saved, imageUrl: saved.localImage };
  } catch {
    return null;
  }
}
