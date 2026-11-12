import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  analyticsKeys,
  blueprintKeys,
  blueprintsApi,
  type CreateAreaInput,
  type CreateBlueprintInput,
} from "@/lib/api";

export function useBlueprints(enabled = true) {
  return useQuery({
    queryKey: blueprintKeys.list(),
    queryFn: ({ signal }) => blueprintsApi.list(signal),
    staleTime: 10 * 60_000,
    enabled,
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

export function useCreateBlueprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBlueprintInput) => blueprintsApi.create(body),
    onSuccess: (created) => {
      queryClient.setQueryData(blueprintKeys.detail(created.id), created);
      void queryClient.invalidateQueries({ queryKey: blueprintKeys.list() });
    },
  });
}

export function useAddArea(blueprintId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAreaInput) => blueprintsApi.addArea(blueprintId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: blueprintKeys.detail(blueprintId) });
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.heatmap({}).slice(0, 2) });
    },
  });
}
