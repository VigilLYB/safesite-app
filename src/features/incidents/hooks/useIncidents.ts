import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { actionsApi, compact, incidentKeys, incidentsApi, actionKeys } from "@/lib/api";
import type { IncidentFilters } from "@/lib/api";
import { isUuid } from "@/lib/validation";

export function useIncidentList(filters: IncidentFilters, options: { pollMs?: number } = {}) {
  return useInfiniteQuery({
    queryKey: incidentKeys.list(compact(filters)),
    queryFn: ({ pageParam, signal }) =>
      incidentsApi.list({ ...filters, cursor: pageParam }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pageInfo.nextCursor ?? undefined,
    placeholderData: (previous) => previous,
    // Guide §2.5: only the New Incidents tab polls, and not while the tab is in the background.
    refetchInterval: options.pollMs ?? false,
    refetchIntervalInBackground: false,
  });
}

/** A malformed id never reaches the network: the page shows not-found directly. */
export function useIncident(id: string) {
  return useQuery({
    queryKey: incidentKeys.detail(id),
    queryFn: ({ signal }) => incidentsApi.get(id, signal),
    enabled: isUuid(id),
    refetchInterval: (query) =>
      query.state.data?.processing.transcription === "PENDING" ? 4_000 : false,
  });
}

export function useIncidentTimeline(id: string, enabled = true) {
  return useQuery({
    queryKey: incidentKeys.timeline(id),
    queryFn: ({ signal }) => incidentsApi.timeline(id, signal),
    enabled: enabled && isUuid(id),
  });
}

export function useIncidentVersion(id: string, version: number | null) {
  return useQuery({
    queryKey: incidentKeys.version(id, version ?? 0),
    queryFn: ({ signal }) => incidentsApi.version(id, version as number, signal),
    enabled: version !== null && isUuid(id),
    // The snapshot never changes, but its media links expire after 60 min (guide §2.5).
    staleTime: 50 * 60_000,
  });
}

export function useSimilarIncidents(id: string, limit: number, enabled: boolean) {
  return useQuery({
    queryKey: incidentKeys.similar(id, limit),
    queryFn: ({ signal }) => incidentsApi.similar(id, limit, signal),
    enabled,
  });
}

export function useIncidentDuplicates(parentId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: incidentKeys.duplicates(parentId ?? "none"),
    queryFn: ({ signal }) => incidentsApi.duplicates(parentId as string, signal),
    enabled: enabled && parentId !== null,
  });
}

export function usePpeScans(id: string, enabled: boolean) {
  return useQuery({
    queryKey: incidentKeys.ppe(id),
    queryFn: ({ signal }) => incidentsApi.ppeScans(id, signal),
    enabled,
  });
}

/** The Action tab: every action ever assigned on this incident. */
export function useIncidentActions(incidentId: string, enabled: boolean) {
  return useQuery({
    queryKey: actionKeys.list({ incidentId }),
    queryFn: ({ signal }) => actionsApi.list({ incidentId }, signal),
    enabled,
  });
}
