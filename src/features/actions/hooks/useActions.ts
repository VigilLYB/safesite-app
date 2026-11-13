import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actionKeys,
  actionsApi,
  analyticsKeys,
  compact,
  incidentKeys,
  type Action,
  type ActionFilters,
  type AssignActionInput,
} from "@/lib/api";
import { isUuid } from "@/lib/validation";
import { ACTIONS_PAGE_SIZE } from "../lib/list-params";

/** Offset paging, 50 per page; stops when fewer than 50 come back (there is no total count). */
export function useActionList(filters: ActionFilters) {
  return useInfiniteQuery({
    queryKey: actionKeys.list(compact(filters)),
    queryFn: ({ pageParam, signal }) =>
      actionsApi.list({ ...filters, limit: ACTIONS_PAGE_SIZE, offset: pageParam }, signal),
    initialPageParam: 0,
    getNextPageParam: (last, _all, lastOffset) =>
      last.length < ACTIONS_PAGE_SIZE ? undefined : lastOffset + ACTIONS_PAGE_SIZE,
    placeholderData: (previous) => previous,
  });
}

export function useAction(id: string) {
  return useQuery({
    queryKey: actionKeys.detail(id),
    queryFn: ({ signal }) => actionsApi.get(id, signal),
    enabled: isUuid(id),
  });
}

export function useActionTemplates(enabled = true) {
  return useQuery({
    queryKey: actionKeys.templates(),
    queryFn: ({ signal }) => actionsApi.templates(signal),
    enabled,
    staleTime: 60 * 60_000,
  });
}

export function useAssignAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { incidentId: string } & AssignActionInput) => {
      const { incidentId, ...body } = v;
      return actionsApi.assign(incidentId, body);
    },
    onSuccess: (action, variables) => {
      queryClient.setQueryData(actionKeys.detail(action.id), action);
      void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(variables.incidentId) });
      void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: actionKeys.lists() });
    },
    onError: (error, variables) => {
      // 409 (already has an active action) and 422 (no longer APPROVED): the report moved on.
      void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(variables.incidentId) });
      return error;
    },
  });
}

/** Completing work can resolve the incident, so refresh incidents and analytics too. */
function useProgress<V>(mutationFn: (variables: V) => Promise<Action>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (action) => {
      queryClient.setQueryData(actionKeys.detail(action.id), action);
      void queryClient.invalidateQueries({ queryKey: actionKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(action.incident.id) });
      void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    },
    onError: (_error, _v) => {
      // 403/422: the action moved on. Refetch so the buttons match the server.
      void queryClient.invalidateQueries({ queryKey: actionKeys.all });
    },
  });
}

export const useCompleteMilestone = () =>
  useProgress((v: { actionId: string; milestoneId: string }) =>
    actionsApi.completeMilestone(v.actionId, v.milestoneId),
  );

/** Staff move a live action to someone else; the report's timeline gains a node, so refresh it. */
export const useReassignAction = () =>
  useProgress((v: { actionId: string; assigneeId: string | null }) =>
    actionsApi.reassign(v.actionId, v.assigneeId),
  );

export const useCompleteAction = () =>
  useProgress((actionId: string) => actionsApi.complete(actionId));
