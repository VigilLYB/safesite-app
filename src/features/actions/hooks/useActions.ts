import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actionKeys,
  actionsApi,
  analyticsKeys,
  compact,
  incidentKeys,
  userKeys,
  type Action,
  type ActionFilters,
  type AssignActionInput,
} from "@/lib/api";
import { isUuid } from "@/lib/validation";
import { isOnline } from "@/lib/offline/network";
import {
  isOfflineError,
  isQueuedResult,
  mayHaveBeenSent,
  queueActionComplete,
  queueMilestone,
} from "@/lib/offline/queue-change";
import type { QueryClient } from "@tanstack/react-query";
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
      void queryClient.invalidateQueries({ queryKey: userKeys.all }); // open-action counts
    },
    onError: (error, variables) => {
      // 409 (already has an active action) and 422 (no longer APPROVED): the report moved on.
      void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(variables.incidentId) });
      return error;
    },
  });
}

type Queue<V> = (
  queryClient: QueryClient,
  variables: V,
  maybeSent: boolean,
) => Promise<Action | null>;

/**
 * Completing work can resolve the incident, so refresh incidents and analytics too.
 * With `queue`, the change is saved on the device when there is no connection, shown at once,
 * and sent later by the outbox (the server treats a repeat as a no-op).
 */
function useProgress<V>(mutationFn: (variables: V) => Promise<Action>, queue?: Queue<V>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: V) => {
      if (queue && !isOnline()) {
        const queued = await queue(queryClient, variables, false);
        if (queued) return queued;
      }
      try {
        return await mutationFn(variables);
      } catch (error) {
        if (queue && isOfflineError(error)) {
          const queued = await queue(queryClient, variables, mayHaveBeenSent(error));
          if (queued) return queued;
        }
        throw error;
      }
    },
    onSuccess: (action) => {
      queryClient.setQueryData(actionKeys.detail(action.id), action);
      if (isQueuedResult(action)) return; // offline: a refetch now would undo what is shown
      void queryClient.invalidateQueries({ queryKey: actionKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(action.incident.id) });
      void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      void queryClient.invalidateQueries({ queryKey: userKeys.all }); // open-action counts
    },
    onError: (_error, _v) => {
      // 403/422: the action moved on. Refetch so the buttons match the server.
      void queryClient.invalidateQueries({ queryKey: actionKeys.all });
    },
  });
}

export const useCompleteMilestone = () =>
  useProgress(
    (v: { actionId: string; milestoneId: string }) =>
      actionsApi.completeMilestone(v.actionId, v.milestoneId),
    (queryClient, v, maybeSent) =>
      queueMilestone(queryClient, v.actionId, v.milestoneId, { maybeSent }),
  );

/** Staff move a live action to someone else; the report's timeline gains a node, so refresh it. */
export const useReassignAction = () =>
  useProgress((v: { actionId: string; assigneeId: string | null }) =>
    actionsApi.reassign(v.actionId, v.assigneeId),
  );

export const useCompleteAction = () =>
  useProgress(
    (actionId: string) => actionsApi.complete(actionId),
    (queryClient, actionId, maybeSent) => queueActionComplete(queryClient, actionId, { maybeSent }),
  );
