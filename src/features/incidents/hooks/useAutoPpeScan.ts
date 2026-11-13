import { useEffect, useRef } from "react";
import type { Incident } from "@/lib/api";
import { useRunPpeScan } from "./useIncidentMutations";
import { usePpeScans } from "./useIncidents";

/**
 * PPE is checked once per photo, automatically: when the report's current photo has no scan yet
 * (a new report, or the photo was replaced), one scan runs. There is no manual re-run; a failed
 * scan can be retried.
 */
export function useAutoPpeScan(incident: Pick<Incident, "id" | "photo" | "permissions">) {
  const photoKey = incident.photo?.key ?? null;
  const allowed = photoKey !== null && incident.permissions.canRunPpeScan;
  const scans = usePpeScans(incident.id, allowed);
  const run = useRunPpeScan();
  const attempted = useRef<string | null>(null);
  const scanned = scans.data?.some((scan) => scan.photoKey === photoKey) ?? false;
  const { mutate } = run;

  useEffect(() => {
    if (!allowed || !photoKey || !scans.isSuccess || scanned) return;
    if (attempted.current === photoKey) return;
    attempted.current = photoKey;
    mutate(incident.id);
  }, [allowed, photoKey, scans.isSuccess, scanned, mutate, incident.id]);

  return {
    running: run.isPending,
    error: run.error,
    retry: () => mutate(incident.id),
  };
}
