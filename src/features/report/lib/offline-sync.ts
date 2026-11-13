import { isApiError, userMessage } from "@/lib/api";
import type { OfflineFiles } from "@/lib/offline/files";
import { offlineFiles } from "@/lib/offline/files";
import { buildSubmitBody } from "./body";
import { dequeueOfflineReport, listOfflineReports, markOfflineReportFailed } from "./offline-queue";
import { isAmbiguousFailure, SavedOnDevice, submitWithRecovery, type SubmitDeps } from "./submit";

/** A connection problem, a server outage, or a sign-in problem: try again later, unchanged. */
function isTransient(error: unknown): boolean {
  if (error instanceof SavedOnDevice || isAmbiguousFailure(error)) return true;
  if (!isApiError(error)) return true; // e.g. the file system: not the report's fault
  return error.kind === "server" || error.kind === "unauthorized" || error.status === 429;
}

/**
 * Resends every report `userId` saved on this device, oldest first. Each is independent: one
 * still failing does not block the rest. A report the server refuses (validation, forbidden)
 * is marked failed and kept for the person to retry or discard; it is not resent every time.
 */
export async function flushOfflineQueue(
  deps: SubmitDeps,
  userId: string,
  files: OfflineFiles = offlineFiles,
): Promise<{ sent: number; failed: number }> {
  const queued = await listOfflineReports(userId, files);
  let sent = 0;
  let failed = 0;
  for (const report of queued) {
    if (report.status === "failed") continue;
    try {
      await submitWithRecovery({
        photo: report.photo,
        audio: report.audio,
        cache: new Map(),
        deps,
        build: (keys) => buildSubmitBody({ ...report.input, ...keys }),
      });
      await dequeueOfflineReport(report.id, files);
      sent += 1;
    } catch (error) {
      if (isApiError(error) && error.kind === "unauthorized") break; // signed out: stop here
      if (isTransient(error)) continue;
      await markOfflineReportFailed(report.id, userMessage(error), files);
      failed += 1;
    }
  }
  return { sent, failed };
}
