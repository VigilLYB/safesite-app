import { clock } from "@/lib/clock";
import { offlineFiles, type OfflineFiles } from "@/lib/offline/files";
import type { ReportInput } from "./body";

export interface QueuedMedia {
  uri: string;
  contentType: string;
}

export interface QueuedReport {
  id: string;
  /** Who made it. Only their session sends it, so a shared device never files it as someone else. */
  userId: string | null;
  savedAt: number;
  input: Omit<ReportInput, "photoKey" | "audioKey">;
  photo: QueuedMedia | null;
  audio: QueuedMedia | null;
  /** `failed`: the server refused it (not a connection problem). It waits for Retry or Discard. */
  status?: "pending" | "failed" | undefined;
  error?: string | null | undefined;
}

const DIR = "offline-reports";
const draftPath = (id: string) => [DIR, id, "draft.json"];

/** Copies a capture out of its (possibly temporary) cache URI into the report's own folder. */
async function persistMedia(
  files: OfflineFiles,
  id: string,
  kind: "photo" | "audio",
  media: QueuedMedia | null,
): Promise<QueuedMedia | null> {
  if (!media) return null;
  const extension = /\.[A-Za-z0-9]+$/.exec(media.uri.split("?")[0] ?? "")?.[0] ?? "";
  const uri = await files.copyIn(media.uri, [DIR, id, `${kind}${extension}`]);
  return { uri, contentType: media.contentType };
}

/**
 * Persists a report that failed to send (lib/submit.ts's `SavedOnDevice`) so it survives an app
 * restart. Files are copied out of their capture cache into the app's document directory, which
 * the OS does not clear. No storage permission is needed for that folder.
 */
export async function enqueueOfflineReport(
  args: {
    id: string;
    userId: string;
    input: Omit<ReportInput, "photoKey" | "audioKey">;
    photo: QueuedMedia | null;
    audio: QueuedMedia | null;
  },
  files: OfflineFiles = offlineFiles,
): Promise<void> {
  const record: QueuedReport = {
    id: args.id,
    userId: args.userId,
    savedAt: clock.nowMs(),
    input: args.input,
    photo: await persistMedia(files, args.id, "photo", args.photo),
    audio: await persistMedia(files, args.id, "audio", args.audio),
    status: "pending",
    error: null,
  };
  await files.writeText(draftPath(args.id), JSON.stringify(record));
}

/**
 * Reports saved on this device by `userId`, oldest first. Reports saved before reports had an
 * owner (`userId: null`) are never sent automatically: nobody can say whose they are.
 */
export async function listOfflineReports(
  userId: string,
  files: OfflineFiles = offlineFiles,
): Promise<QueuedReport[]> {
  const records: QueuedReport[] = [];
  for (const id of await files.list([DIR])) {
    const raw = await files.readText(draftPath(id));
    if (raw === null) continue;
    try {
      const record = JSON.parse(raw) as QueuedReport;
      if (record.userId === userId) records.push(record);
    } catch {
      await files.remove([DIR, id]); // Corrupt entry: drop it rather than retrying it forever.
    }
  }
  return records.sort((a, b) => a.savedAt - b.savedAt);
}

async function patchReport(
  id: string,
  changes: Pick<QueuedReport, "status" | "error">,
  files: OfflineFiles,
): Promise<void> {
  const raw = await files.readText(draftPath(id));
  if (raw === null) return;
  const record = JSON.parse(raw) as QueuedReport;
  await files.writeText(draftPath(id), JSON.stringify({ ...record, ...changes }));
}

/** The server refused it for a reason a resend cannot fix: keep it, but stop sending it. */
export const markOfflineReportFailed = (
  id: string,
  error: string,
  files: OfflineFiles = offlineFiles,
) => patchReport(id, { status: "failed", error }, files);

/** "Retry": send it again on the next sync. */
export const markOfflineReportPending = (id: string, files: OfflineFiles = offlineFiles) =>
  patchReport(id, { status: "pending", error: null }, files);

/** Removes a queued report and its files once the server has confirmed it (or on Discard). */
export async function dequeueOfflineReport(
  id: string,
  files: OfflineFiles = offlineFiles,
): Promise<void> {
  await files.remove([DIR, id]);
}
