import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { compact, incidentKeys, incidentsApi, type IncidentFilters } from "@/lib/api";

export function useIncidentList(filters: IncidentFilters) {
  return useInfiniteQuery({
    queryKey: incidentKeys.list(compact(filters)),
    queryFn: ({ pageParam, signal }) =>
      incidentsApi.list({ ...filters, cursor: pageParam }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pageInfo.nextCursor ?? undefined,
  });
}

/** Polls only while the voice note is still being transcribed; stops at any terminal state. */
export function useIncident(id: string) {
  return useQuery({
    queryKey: incidentKeys.detail(id),
    queryFn: ({ signal }) => incidentsApi.get(id, signal),
    refetchInterval: (query) =>
      query.state.data?.processing.transcription === "PENDING" ? 4_000 : false,
  });
}

export function useIncidentTimeline(id: string) {
  return useQuery({
    queryKey: incidentKeys.timeline(id),
    queryFn: ({ signal }) => incidentsApi.timeline(id, signal),
  });
}

export function useIncidentVersion(id: string, version: number | null) {
  return useQuery({
    queryKey: incidentKeys.version(id, version ?? 0),
    queryFn: ({ signal }) => incidentsApi.version(id, version as number, signal),
    enabled: version !== null,
    staleTime: Infinity, // a historical version never changes
  });
}

export function useSimilarIncidents(id: string, enabled: boolean) {
  return useQuery({
    queryKey: incidentKeys.similar(id),
    queryFn: ({ signal }) => incidentsApi.similar(id, signal),
    enabled,
  });
}

export function useIncidentDuplicates(id: string, enabled: boolean) {
  return useQuery({
    queryKey: incidentKeys.duplicates(id),
    queryFn: ({ signal }) => incidentsApi.duplicates(id, signal),
    enabled,
  });
}

export function usePpeScans(id: string) {
  return useQuery({
    queryKey: incidentKeys.ppe(id),
    queryFn: ({ signal }) => incidentsApi.ppeScans(id, signal),
  });
}
