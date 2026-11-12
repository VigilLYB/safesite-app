import { isApiError, userMessage } from "@/lib/api";
import { StateLayout } from "./StateLayout";

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  /** A second way out, e.g. "Go home" on a full-page error. */
  secondary?: { label: string; onPress: () => void } | undefined;
  size?: "page" | "inline" | undefined;
}

/** Forbidden, not-found, offline and server errors read differently and say what to do. */
export function ErrorState({ error, onRetry, secondary, size = "inline" }: ErrorStateProps) {
  const kind = isApiError(error) ? error.kind : "unknown";
  const offline = kind === "network" || kind === "timeout";
  const title =
    kind === "forbidden"
      ? "No access"
      : kind === "notFound"
        ? "Not found or not shared with you"
        : offline
          ? "Can't reach the server"
          : "Something went wrong";
  return (
    <StateLayout
      icon={kind === "forbidden" ? "shield" : offline ? "wifi" : "warn"}
      title={title}
      message={userMessage(error)}
      reference={isApiError(error) ? error.correlationId : undefined}
      primary={
        onRetry && kind !== "forbidden" ? { label: "Try again", onPress: onRetry } : undefined
      }
      secondary={secondary}
      size={size}
      role="alert"
    />
  );
}
