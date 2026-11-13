import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  actionKeys,
  actionsApi,
  analyticsKeys,
  incidentKeys,
  incidentsApi,
  uploadFile,
  userKeys,
  userMessage,
} from "@/lib/api";
import { clock } from "@/lib/clock";
import { isOnline, onReconnect } from "@/lib/offline/network";
import { outbox, type OutboxEntry } from "@/lib/offline/outbox";
import {
  dequeueOfflineReport,
  flushOfflineQueue,
  listOfflineReports,
  markOfflineReportPending,
  notifyOfflineQueueChanged,
  onOfflineQueueChanged,
  type QueuedReport,
  type SubmitDeps,
} from "@/features/report";
import { replayOutbox, type ReplayDeps } from "../lib/replay";

const submitDeps: SubmitDeps = {
  upload: uploadFile,
  submit: incidentsApi.submit,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  nowMs: () => clock.nowMs(),
};

const replayDeps: ReplayDeps = {
  edit: incidentsApi.edit,
  transition: incidentsApi.transition,
  getIncident: (id) => incidentsApi.get(id),
  completeMilestone: actionsApi.completeMilestone,
  completeAction: actionsApi.complete,
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "open",
  VALIDATED: "validated",
  APPROVED: "approved",
  REJECTED: "rejected",
  RESOLVED: "resolved",
  CLOSED: "closed",
};

/**
 * Sends everything saved on this device for the signed-in person: new reports first (others may
 * act on them), then queued changes in order. Runs at sign-in / app launch, when the connection
 * returns, and on "Send now". Mount once, in the signed-in shell.
 */
export function useSync(userId: string) {
  const queryClient = useQueryClient();
  const [reports, setReports] = useState<QueuedReport[]>([]);
  const [syncing, setSyncing] = useState(false);
  const running = useRef(false);
  const again = useRef(false);

  const changes = useSyncExternalStore(outbox.subscribe, outbox.entries, outbox.entries);

  const refreshReports = useCallback(async () => {
    try {
      setReports(await listOfflineReports(userId));
    } catch {
      setReports([]);
    }
  }, [userId]);

  const sync = useCallback(async () => {
    if (running.current) {
      again.current = true; // something changed mid-run: go round once more afterwards
      return;
    }
    running.current = true;
    setSyncing(true);
    try {
      do {
        again.current = false;
        if (!isOnline()) break;
        let changed = false;
        try {
          const { sent, failed } = await flushOfflineQueue(submitDeps, userId);
          changed ||= sent > 0 || failed > 0;
        } catch {
          // e.g. storage unreadable: the changes below can still go
        }
        try {
          const { sent } = await replayOutbox(outbox, replayDeps);
          changed ||= sent.length > 0;
        } catch {
          // keep what is queued
        }
        if (changed) {
          void queryClient.invalidateQueries({ queryKey: incidentKeys.all });
          void queryClient.invalidateQueries({ queryKey: actionKeys.all });
          void queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
          void queryClient.invalidateQueries({ queryKey: userKeys.all });
        }
      } while (again.current);
    } finally {
      running.current = false;
      setSyncing(false);
      await refreshReports();
    }
  }, [queryClient, refreshReports, userId]);

  useEffect(() => {
    let active = true;
    void outbox.load(userId).then(() => {
      // sync() also loads the saved-report list when it finishes, online or not.
      if (active) void sync();
    });
    const stopReconnect = onReconnect(() => void sync());
    const stopQueue = onOfflineQueueChanged(() => void refreshReports());
    return () => {
      active = false;
      stopReconnect();
      stopQueue();
      outbox.unload();
    };
  }, [refreshReports, sync, userId]);

  /** Queued changes appear while offline; send them as soon as they are queued if online. */
  const pendingChanges = changes.filter((c) => c.status === "pending").length;
  useEffect(() => {
    if (pendingChanges > 0 && isOnline()) void sync();
  }, [pendingChanges, sync]);

  const sendAnyway = useCallback(
    async (entry: OutboxEntry): Promise<string | null> => {
      const change = entry.change;
      if (change.kind !== "incident.edit" && change.kind !== "incident.transition") return null;
      try {
        const current = await incidentsApi.get(change.incidentId);
        queryClient.setQueryData(incidentKeys.detail(current.id), current);
        if (
          change.kind === "incident.transition" &&
          !current.permissions.transitions.includes(change.event)
        ) {
          const status = STATUS_LABEL[current.status] ?? current.status.toLowerCase();
          await outbox.mark(
            entry.id,
            "failed",
            `This change no longer applies: the report is now ${status}.`,
          );
          return null;
        }
        if (change.kind === "incident.edit" && !current.permissions.canEdit) {
          await outbox.mark(entry.id, "failed", "You can no longer edit this report.");
          return null;
        }
        await outbox.rebase(entry.id, current.version);
        await sync();
        return null;
      } catch (error) {
        return userMessage(error);
      }
    },
    [queryClient, sync],
  );

  const retryReport = useCallback(
    async (id: string) => {
      await markOfflineReportPending(id);
      await refreshReports();
      await sync();
    },
    [refreshReports, sync],
  );

  const discardReport = useCallback(async (id: string) => {
    await dequeueOfflineReport(id);
    notifyOfflineQueueChanged();
  }, []);

  const waiting =
    reports.filter((r) => r.status !== "failed").length +
    changes.filter((c) => c.status === "pending").length;
  const attention =
    reports.filter((r) => r.status === "failed").length +
    changes.filter((c) => c.status !== "pending").length;

  return {
    reports,
    changes,
    /** Saved on the device, to be sent automatically. */
    waiting,
    /** Refused or in conflict: the person has to choose. */
    attention,
    syncing,
    syncNow: () => void sync(),
    retryReport,
    discardReport,
    discardChange: (id: string) => outbox.discard(id),
    retryChange: async (id: string) => {
      await outbox.mark(id, "pending");
      await sync();
    },
    sendAnyway,
  };
}

export type SyncState = ReturnType<typeof useSync>;
