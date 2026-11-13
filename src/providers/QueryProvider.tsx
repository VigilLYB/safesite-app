import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isApiError } from "@/lib/api";
import { connectOnlineManager } from "@/lib/offline/network";

/** 4xx means retrying cannot help; anything else gets one retry. Mutations never auto-retry. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}

/** Saved reads are kept this long in memory so they can be written to (and read from) the device. */
const ONE_DAY_MS = 24 * 60 * 60_000;

connectOnlineManager();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      staleTime: 30_000,
      gcTime: ONE_DAY_MS,
      refetchOnWindowFocus: false,
      // Offline: try once (a cold start with nothing saved shows the offline state, not a
      // spinner forever), then keep showing saved data and refetch when the connection returns.
      networkMode: "offlineFirst",
    },
    // Mutations always run, so a failure is reported at once. Offline changes are not paused here:
    // they go to the outbox (lib/offline/outbox.ts), which survives the app closing.
    mutations: { retry: false, networkMode: "always" },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
