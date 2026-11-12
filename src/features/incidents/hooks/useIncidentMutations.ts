import { useMutation, useQueryClient } from "@tanstack/react-query";
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

/** Every change returns the new immutable version: cache it, then refresh what depends on it. */
function useIncidentMutation<V>(mutationFn: (variables: V) => Promise<Incident>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (incident) => {
      queryClient.setQueryData(incidentKeys.detail(incident.id), incident);
      void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: incidentKeys.timeline(incident.id) });
      void queryClient.invalidateQueries({ queryKey: incidentKeys.duplicates(incident.id) });
      void queryClient.invalidateQueries({ queryKey: incidentKeys.similar(incident.id) });
      void queryClient.invalidateQueries({ queryKey: actionKeys.all });
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    },
    onError: (error, _variables) => {
      // Someone else changed the report: reload it so the next attempt uses the right version.
      if (isStaleVersion(error)) void queryClient.invalidateQueries({ queryKey: incidentKeys.all });
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
        note: v.note,
      }),
  );

export const useEditIncident = () =>
  useIncidentMutation((v: { id: string } & EditIncidentInput) => {
    const { id, ...body } = v;
    return incidentsApi.edit(id, body);
  });

export const useClusterIncident = () =>
  useIncidentMutation((v: { id: string; parentIncidentId: string; expectedVersion: number }) =>
    incidentsApi.cluster(v.id, {
      parentIncidentId: v.parentIncidentId,
      expectedVersion: v.expectedVersion,
    }),
  );

export const useUnclusterIncident = () =>
  useIncidentMutation((v: { id: string; expectedVersion: number }) =>
    incidentsApi.uncluster(v.id, { expectedVersion: v.expectedVersion }),
  );

export const useRetryTranscription = () =>
  useIncidentMutation((id: string) => incidentsApi.retryTranscription(id));

export function useRunPpeScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => incidentsApi.runPpeScan(id),
    onSuccess: (scan) => {
      void queryClient.invalidateQueries({ queryKey: incidentKeys.ppe(scan.incidentId) });
    },
  });
}
