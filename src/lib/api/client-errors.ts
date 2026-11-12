import { ApiError, kindFromStatus } from "./errors";

/**
 * The API answers `{ error: { code, message, details?, correlationId } }`. API Gateway answers
 * `{ message }` for throttling (429) and Lambda timeouts (502/503/504). Both become one ApiError.
 */
export function toApiError(status: number, payload: unknown, fallbackCorrelationId?: string) {
  const root = (payload ?? {}) as { error?: Record<string, unknown>; message?: unknown };
  const envelope = root.error;
  const code = typeof envelope?.code === "string" ? envelope.code : gatewayCode(status);
  const message =
    typeof envelope?.message === "string"
      ? envelope.message
      : typeof root.message === "string"
        ? root.message
        : `Request failed (${status})`;
  const correlationId =
    typeof envelope?.correlationId === "string" ? envelope.correlationId : fallbackCorrelationId;
  return new ApiError({
    status,
    code,
    message,
    kind: kindFromStatus(status),
    correlationId,
    details: envelope?.details,
  });
}

function gatewayCode(status: number): string {
  if (status === 429) return "THROTTLED";
  if (status === 503 || status === 504) return "GATEWAY_TIMEOUT";
  return `HTTP_${status}`;
}
