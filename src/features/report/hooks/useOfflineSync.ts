import { useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { analyticsKeys, incidentKeys, incidentsApi, uploadFile } from "@/lib/api";
import { clock } from "@/lib/clock";
import { listOfflineReports } from "../lib/offline-queue";
import { flushOfflineQueue } from "../lib/offline-sync";
import type { SubmitDeps } from "../lib/submit";

const deps: SubmitDeps = {
  upload: uploadFile,
  submit: incidentsApi.submit,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  nowMs: () => clock.nowMs(),
};

/**
 * Resends reports saved on this device (useSubmitReport's `SavedOnDevice`) on app launch and
 * whenever connectivity returns. Mount once near the app root. Returns how many are still
 * waiting, for a status banner.
 */
export function useOfflineSync() {
  const [pending, setPending] = useState(0);
  const queryClient = useQueryClient();
  const flushing = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const refreshCount = async () => {
      const count = (await listOfflineReports()).length;
      if (!cancelled) setPending(count);
    };

    const flush = async () => {
      if (flushing.current) return;
      flushing.current = true;
      try {
        const { sent } = await flushOfflineQueue(deps);
        if (sent > 0) {
          void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
          void queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
        }
      } finally {
        flushing.current = false;
        await refreshCount();
      }
    };

    void refreshCount();
    void flush();
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) void flush();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [queryClient]);

  return { pending };
}
