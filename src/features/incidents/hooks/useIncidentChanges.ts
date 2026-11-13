import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  incidentKeys,
  isStaleVersion,
  type AssignActionInput,
  type EditIncidentInput,
  type Incident,
  type TransitionEvent,
} from "@/lib/api";
import { isOnline } from "@/lib/offline/network";
import {
  isOfflineError,
  mayHaveBeenSent,
  queueIncidentEdit,
  queueTransition,
} from "@/lib/offline/queue-change";
import { useAssignAction } from "@/features/actions";
import {
  useClusterIncident,
  useEditIncident,
  useMoveIncident,
  useRetryTranscription,
  useTransition,
  useUnclusterIncident,
} from "./useIncidentMutations";

export interface StaleChange {
  /** The version the person's change was based on. */
  expected: number;
  /** Still allowed by the fresh `permissions`? Offered only then (guide §2.4). */
  allowed: (fresh: Incident) => boolean;
  /** Re-send against the fresh version. Never done silently. */
  retry: (fresh: Incident) => Promise<Outcome>;
}

export type Outcome = "ok" | "stale" | "error";

/**
 * Every report change in one place so a 409 STALE_VERSION always lands in the same dialog:
 * keep the person's input, refetch, then ask — never retry silently (guide §2.4).
 */
export function useIncidentChanges(incident: Incident) {
  const queryClient = useQueryClient();
  const transition = useTransition();
  const edit = useEditIncident();
  const move = useMoveIncident();
  const cluster = useClusterIncident();
  const uncluster = useUnclusterIncident();
  const retryTx = useRetryTranscription();
  const assign = useAssignAction();
  const [assignedId, setAssignedId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  // Its own slot: the shared `error` is only rendered inside dialogs and the Location tab.
  const [transcriptionError, setTranscriptionError] = useState<unknown>(null);
  const [stale, setStale] = useState<StaleChange | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * `offline`: how to save this change on the device when there is no connection (only for
   * changes that are safe to send later). Without it, an offline change fails as before.
   */
  async function run(
    allowed: StaleChange["allowed"],
    exec: (version: number, current: Incident) => Promise<unknown>,
    base: Incident = incident,
    offline?: (current: Incident, maybeSent: boolean) => Promise<void>,
  ): Promise<Outcome> {
    {
      setError(null);
      setBusy(true);
      try {
        if (offline && !isOnline()) {
          await offline(base, false);
          return "ok";
        }
        await exec(base.version, base);
        return "ok";
      } catch (caught) {
        if (offline && isOfflineError(caught)) {
          try {
            await offline(base, mayHaveBeenSent(caught));
            return "ok";
          } catch {
            setError(caught); // could not even save it on the device: show the connection error
            return "error";
          }
        }
        if (isStaleVersion(caught)) {
          setStale({
            expected: base.version,
            allowed,
            retry: (fresh) => run(allowed, exec, fresh, offline),
          });
          return "stale";
        }
        setError(caught);
        // 403 / 422: the report moved on. Refetch so the buttons match the server.
        void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(incident.id) });
        return "error";
      } finally {
        setBusy(false);
      }
    }
  }

  return {
    error,
    clearError: () => setError(null),
    stale,
    dismissStale: () => setStale(null),
    busy,
    transition: (event: TransitionEvent, note?: string) =>
      run(
        (fresh) => fresh.permissions.transitions.includes(event),
        (version) =>
          transition.mutateAsync({ id: incident.id, event, expectedVersion: version, note }),
        incident,
        (current, maybeSent) => queueTransition(queryClient, current, event, note, { maybeSent }),
      ),
    edit: (patch: Omit<EditIncidentInput, "expectedVersion">) => {
      const { photoKey, ...fields } = patch;
      return run(
        (fresh) => fresh.permissions.canEdit,
        (version) => edit.mutateAsync({ id: incident.id, ...patch, expectedVersion: version }),
        incident,
        // A new photo needs an upload, so a photo change cannot wait for later.
        photoKey === undefined
          ? (current, maybeSent) => queueIncidentEdit(queryClient, current, fields, { maybeSent })
          : undefined,
      );
    },
    move: (target: { blueprintId: string; x: number; y: number }) =>
      run(
        (fresh) => fresh.permissions.canEdit,
        (version) => move.mutateAsync({ id: incident.id, ...target, expectedVersion: version }),
      ),
    link: (parentIncidentId: string, note?: string) =>
      run(
        (fresh) => fresh.permissions.canCluster,
        (version) =>
          cluster.mutateAsync({
            id: incident.id,
            parentIncidentId,
            oldParentId: incident.cluster.parentIncidentId,
            expectedVersion: version,
            note,
          }),
      ),
    unlink: (note?: string) =>
      run(
        (fresh) => fresh.cluster.isDuplicate,
        (version) =>
          uncluster.mutateAsync({
            id: incident.id,
            parentId: incident.cluster.parentIncidentId,
            expectedVersion: version,
            note,
          }),
      ),
    assign: (body: Omit<AssignActionInput, "expectedVersion">) =>
      run(
        (fresh) => fresh.permissions.canAssignAction,
        async (version) => {
          const created = await assign.mutateAsync({
            incidentId: incident.id,
            expectedVersion: version,
            ...body,
          });
          setAssignedId(created.id);
        },
      ),
    assignedActionId: assignedId,
    clearAssigned: () => setAssignedId(null),
    retryTranscription: async (): Promise<Outcome> => {
      setTranscriptionError(null);
      try {
        await retryTx.mutateAsync(incident.id);
        return "ok";
      } catch (caught) {
        setTranscriptionError(caught);
        // The server records the new failure reason on the report: show it in the banner.
        void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(incident.id) });
        return "error";
      }
    },
    transcriptionError,
    retryingTranscription: retryTx.isPending,
  };
}

export type IncidentChanges = ReturnType<typeof useIncidentChanges>;
