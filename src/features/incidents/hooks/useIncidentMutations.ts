import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  actionKeys,
  analyticsKeys,
  incidentKeys,
  incidentsApi,
  isStaleVersion,
  type EditIncidentInput,
  type Incident,
  type TransitionEvent,
} from "@/lib/api";

/** Sub-resources (versions, duplicates, similar, ppe) hang under the detail key. */
function invalidateSubs(queryClient: QueryClient, id: string): void {
  void queryClient.invalidateQueries({
    queryKey: incidentKeys.detail(id),
    predicate: (query) => query.queryKey.length > 3,
  });
}

interface Invalidation {
  actions?: boolean;
  analytics?: "all" | "summary" | false;
  lists?: boolean;
}

/** Every change returns the new immutable version: cache it, then refresh what depends on it. */
function useIncidentMutation<V>(
  mutationFn: (variables: V) => Promise<Incident>,
  invalidate: Invalidation,
  extraDetails?: (variables: V) => (string | null | undefined)[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (incident, variables) => {
      queryClient.setQueryData(incidentKeys.detail(incident.id), incident);
      invalidateSubs(queryClient, incident.id);
      if (invalidate.lists !== false) {
        void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      }
      if (invalidate.actions) void queryClient.invalidateQueries({ queryKey: actionKeys.all });
      if (invalidate.analytics === "all") {
        void queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      } else if (invalidate.analytics === "summary") {
        void queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, "summary"] });
      }
      for (const other of extraDetails?.(variables) ?? []) {
        if (other) void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(other) });
      }
    },
    onError: (error, variables) => {
      // Someone else changed the report: refetch it and its history (guide §2.4).
      if (isStaleVersion(error)) {
        const id = (variables as { id?: string }).id;
        void queryClient.invalidateQueries({
          queryKey: id ? incidentKeys.detail(id) : incidentKeys.all,
        });
      }
    },
  });
}

export const useTransition = () =>
  useIncidentMutation(
    (v: {
      id: string;
      event: TransitionEvent;
      expectedVersion: number;
      note?: string | undefined;
    }) =>
      incidentsApi.transition(v.id, {
        event: v.event,
        expectedVersion: v.expectedVersion,
        ...(v.note ? { note: v.note } : {}),
      }),
    { actions: true, analytics: "all" },
  );

export const useEditIncident = () =>
  useIncidentMutation(
    (v: { id: string } & EditIncidentInput) => {
      const { id, ...body } = v;
      return incidentsApi.edit(id, body);
    },
    { actions: true }, // action cards show the incident title
  );

export const useMoveIncident = () =>
  useIncidentMutation(
    (v: { id: string; expectedVersion: number; blueprintId: string; x: number; y: number }) => {
      const { id, ...body } = v;
      return incidentsApi.move(id, body);
    },
    { analytics: "all" },
  );

export const useClusterIncident = () =>
  useIncidentMutation(
    (v: {
      id: string;
      parentIncidentId: string;
      oldParentId?: string | null | undefined;
      expectedVersion: number;
      note?: string | undefined;
    }) =>
      incidentsApi.cluster(v.id, {
        parentIncidentId: v.parentIncidentId,
        expectedVersion: v.expectedVersion,
        ...(v.note ? { note: v.note } : {}),
      }),
    { analytics: "summary" },
    (v) => [v.parentIncidentId, v.oldParentId],
  );

export const useUnclusterIncident = () =>
  useIncidentMutation(
    (v: {
      id: string;
      parentId?: string | null | undefined;
      expectedVersion: number;
      note?: string | undefined;
    }) =>
      incidentsApi.uncluster(v.id, {
        expectedVersion: v.expectedVersion,
        ...(v.note ? { note: v.note } : {}),
      }),
    { analytics: "summary" },
    (v) => [v.parentId],
  );

export const useRetryTranscription = () =>
  useIncidentMutation((id: string) => incidentsApi.retryTranscription(id), {});

export function useRunPpeScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => incidentsApi.runPpeScan(id),
    onSuccess: (scan) => {
      void queryClient.invalidateQueries({ queryKey: incidentKeys.ppe(scan.incidentId) });
    },
  });
}
