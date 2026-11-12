import { useQuery } from "@tanstack/react-query";
import { blueprintKeys, blueprintsApi } from "@/lib/api";

export function useBlueprints() {
  return useQuery({
    queryKey: blueprintKeys.list(),
    queryFn: ({ signal }) => blueprintsApi.list(signal),
    staleTime: 10 * 60_000,
  });
}

export function useBlueprint(id: string | undefined) {
  return useQuery({
    queryKey: blueprintKeys.detail(id ?? "none"),
    queryFn: ({ signal }) => blueprintsApi.get(id as string, signal),
    enabled: Boolean(id),
    staleTime: 10 * 60_000,
  });
}

/** The plant's default floor plan (falls back to the first one). */
export function useDefaultBlueprint() {
  const query = useBlueprints();
  const items = query.data;
  const blueprint = items?.find((item) => item.isDefault) ?? items?.[0] ?? null;
  return { ...query, blueprint };
}
