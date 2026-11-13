import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { blueprintKeys, blueprintsApi } from "@/lib/api";
import { syncFloorPlanImages } from "@/lib/offline/floor-plans";
import { isOnline, onReconnect } from "@/lib/offline/network";

/**
 * Keeps every floor plan ready for use offline: its details (areas, GPS bounds) go into the read
 * cache, which is saved on the device, and its image is downloaded. Runs after sign-in and each
 * time the connection returns; only new or changed images are downloaded. Mount once.
 */
export function useOfflineFloorPlans(userId: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    let running = false;
    const run = async () => {
      if (running || !isOnline()) return;
      running = true;
      try {
        const plans = await queryClient.fetchQuery({
          queryKey: blueprintKeys.list(),
          queryFn: ({ signal }) => blueprintsApi.list(signal),
          staleTime: 0,
        });
        const details = await Promise.all(
          plans.map((plan) =>
            queryClient
              .fetchQuery({
                queryKey: blueprintKeys.detail(plan.id),
                queryFn: ({ signal }) => blueprintsApi.get(plan.id, signal),
                staleTime: 0,
              })
              .catch(() => plan),
          ),
        );
        // Fresh links from the details just fetched: list links may be close to expiring.
        await syncFloorPlanImages(details);
      } catch {
        // Offline or the server is down: the next reconnect tries again.
      } finally {
        running = false;
      }
    };
    void run();
    return onReconnect(() => void run());
  }, [queryClient, userId]);
}
