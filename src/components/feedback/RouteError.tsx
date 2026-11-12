import type { ErrorBoundaryProps } from "expo-router";
import { useRouter } from "expo-router";
import { Screen } from "@/components/ui";
import { ErrorState } from "./ErrorState";

/** Route-level error boundary (exported from route files): a full error page, never a blank one. */
export function RouteError({ error, retry }: ErrorBoundaryProps) {
  const router = useRouter();
  return (
    <Screen testID="route-error">
      <ErrorState
        error={error}
        size="page"
        onRetry={() => void retry()}
        secondary={{ label: "Go home", onPress: () => router.replace("/") }}
      />
    </Screen>
  );
}
