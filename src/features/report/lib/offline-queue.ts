import { Directory, File, Paths } from "expo-file-system";
import { clock } from "@/lib/clock";
import type { ReportInput } from "./body";

export interface QueuedMedia {
  uri: string;
  contentType: string;
}

export interface QueuedReport {
  id: string;
  savedAt: number;
  input: Omit<ReportInput, "photoKey" | "audioKey">;
  photo: QueuedMedia | null;
  audio: QueuedMedia | null;
}

const root = () => new Directory(Paths.document, "offline-reports");
const reportDir = (id: string) => new Directory(root(), id);

/** Copies a capture out of its (possibly temporary) cache URI into the report's own folder. */
async function persistMedia(
  dir: Directory,
  kind: "photo" | "audio",
  media: QueuedMedia | null,
): Promise<QueuedMedia | null> {
  if (!media) return null;
  const source = new File(media.uri);
  const dest = new File(dir, `${kind}${source.extension}`);
  await source.copy(dest, { overwrite: true });
  return { uri: dest.uri, contentType: media.contentType };
}

/**
 * Persists a report that failed to send (lib/submit.ts's `SavedOnDevice`) so it survives an app
 * restart. Files are copied out of their capture cache into the app's document directory, which
 * the OS does not clear.
 */
export async function enqueueOfflineReport(args: {
  id: string;
  input: Omit<ReportInput, "photoKey" | "audioKey">;
  photo: QueuedMedia | null;
  audio: QueuedMedia | null;
}): Promise<void> {
  const dir = reportDir(args.id);
  if (!dir.exists) dir.create({ intermediates: true });
  const record: QueuedReport = {
    id: args.id,
    savedAt: clock.nowMs(),
    input: args.input,
    photo: await persistMedia(dir, "photo", args.photo),
    audio: await persistMedia(dir, "audio", args.audio),
  };
  await new File(dir, "draft.json").write(JSON.stringify(record));
}

/** Every report still waiting to be sent from this device, oldest first. */
export async function listOfflineReports(): Promise<QueuedReport[]> {
  const dir = root();
  if (!dir.exists) return [];
  const records: QueuedReport[] = [];
  for (const entry of dir.list()) {
    if (!(entry instanceof Directory)) continue;
    const draftFile = new File(entry, "draft.json");
    if (!draftFile.exists) continue;
    try {
      records.push(JSON.parse(await draftFile.text()) as QueuedReport);
    } catch {
      entry.delete(); // Corrupt entry: drop it rather than retrying it forever.
    }
  }
  return records.sort((a, b) => a.savedAt - b.savedAt);
}

/** Removes a queued report and its files once the server has confirmed it. */
export async function dequeueOfflineReport(id: string): Promise<void> {
  const dir = reportDir(id);
  if (dir.exists) dir.delete();
}
