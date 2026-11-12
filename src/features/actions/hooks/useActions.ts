import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actionKeys,
  actionsApi,
  analyticsKeys,
  compact,
  incidentKeys,
  type ActionFilters,
  type AssignActionInput,
} from "@/lib/api";

export function useActions(filters: ActionFilters, enabled = true) {
  return useQuery({
    queryKey: actionKeys.list(compact(filters)),
    queryFn: ({ signal }) => actionsApi.list(filters, signal),
    enabled,
  });
}

export function useActionTemplates(enabled = true) {
  return useQuery({
    queryKey: actionKeys.templates(),
    queryFn: ({ signal }) => actionsApi.templates(signal),
    enabled,
    staleTime: 30 * 60_000,
  });
}

/** Completing work can resolve the incident, so refresh incidents and analytics too. */
function useRefreshAfterAction() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: actionKeys.all });
    void queryClient.invalidateQueries({ queryKey: incidentKeys.all });
    void queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
  };
}

export function useAssignAction() {
  const refresh = useRefreshAfterAction();
  return useMutation({
    mutationFn: (v: { incidentId: string } & AssignActionInput) => {
      const { incidentId, ...body } = v;
      return actionsApi.assign(incidentId, body);
    },
    onSuccess: refresh,
  });
}

export function useCompleteMilestone() {
  const refresh = useRefreshAfterAction();
  return useMutation({
    mutationFn: (v: { actionId: string; milestoneId: string }) =>
      actionsApi.completeMilestone(v.actionId, v.milestoneId),
    onSuccess: refresh,
  });
}

export function useCompleteAction() {
  const refresh = useRefreshAfterAction();
  return useMutation({
    mutationFn: (actionId: string) => actionsApi.complete(actionId),
    onSuccess: refresh,
  });
}
