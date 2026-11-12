import type { ErrorBoundaryProps } from "expo-router";
import { Screen } from "@/components/ui";
import { ErrorState } from "./ErrorState";

/** Route-level error boundary (exported from route files). */
export function RouteError({ error, retry }: ErrorBoundaryProps) {
  return (
    <Screen>
      <ErrorState error={error} onRetry={() => void retry()} />
    </Screen>
  );
}
