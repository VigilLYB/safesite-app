import { buildSubmitBody } from "./body";
import { dequeueOfflineReport, listOfflineReports } from "./offline-queue";
import { submitWithRecovery, type SubmitDeps } from "./submit";

/**
 * Resends every report saved on this device, oldest first. Each is independent: one still
 * failing (still offline, or a real rejection) does not block the rest.
 */
export async function flushOfflineQueue(deps: SubmitDeps): Promise<{ sent: number }> {
  const queued = await listOfflineReports();
  let sent = 0;
  for (const report of queued) {
    try {
      await submitWithRecovery({
        photo: report.photo,
        audio: report.audio,
        cache: new Map(),
        deps,
        build: (keys) => buildSubmitBody({ ...report.input, ...keys }),
      });
      await dequeueOfflineReport(report.id);
      sent += 1;
    } catch {
      // Still offline or a real server error: leave it queued for the next attempt.
    }
  }
  return { sent };
}
