export type ApiErrorKind =
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "validation"
  | "server"
  | "unknown";

interface ApiErrorInit {
  status: number;
  code: string;
  message: string;
  kind: ApiErrorKind;
  correlationId?: string | undefined;
  details?: unknown;
}

/** One typed error for every failed API call. Never relabelled: the code is the server's. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly kind: ApiErrorKind;
  readonly correlationId: string | undefined;
  readonly details: unknown;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.kind = init.kind;
    this.correlationId = init.correlationId;
    this.details = init.details;
  }
}

export function kindFromStatus(status: number): ApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 409) return "conflict";
  if (status === 400 || status === 422) return "validation";
  if (status >= 500) return "server";
  return "unknown";
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

export const isThrottled = (error: unknown): boolean => isApiError(error) && error.status === 429;

export const isStaleVersion = (error: unknown): boolean =>
  isApiError(error) && error.code === "STALE_VERSION";

const COPY: Partial<Record<string, string>> = {
  THROTTLED: "SafeSite is busy. Try again in a moment.",
  UPSTREAM_FAILED: "PPE scanning is unavailable right now. Try again later.",
  STALE_VERSION: "Someone else changed this report. Reload it and try again.",
  INVALID_CREDENTIALS: "Email or password is incorrect.",
  NETWORK_ERROR: "No connection. Check your signal and try again.",
  TIMEOUT: "The server took too long to answer. Try again.",
  RESPONSE_INVALID: "The server sent something the app could not read. Try again later.",
};

const LOOKS_INTERNAL = /select |insert |update |stack|traceback|exception|\bat\s+\S+\.\S+:\d+/i;

/** Copy that is safe to show a person: never SQL, stack traces or server internals. */
export function userMessage(error: unknown): string {
  if (!isApiError(error)) return "Something went wrong. Try again.";
  const known = COPY[error.code];
  if (known) return known;
  if (error.kind === "network") return COPY.NETWORK_ERROR ?? "No connection.";
  if (error.kind === "timeout") return COPY.TIMEOUT ?? "Timed out.";
  if (error.kind === "forbidden") return "Your account does not have access to this.";
  if (error.kind === "notFound") return "That item could not be found.";
  if (error.kind === "server") return "The server had a problem. Try again in a moment.";
  const message = error.message.trim();
  if (message && message.length <= 160 && !LOOKS_INTERNAL.test(message)) return message;
  return "That request could not be completed.";
}

/**
 * Map a 400 VALIDATION_FAILED `details: [{ path, message }]` onto form fields.
 * Paths the form doesn't know (or business-rule errors with no details) come back under "_form".
 */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error) || error.status !== 400) return {};
  const out: Record<string, string> = {};
  const details = error.details;
  if (Array.isArray(details)) {
    for (const item of details) {
      const entry = item as { path?: unknown; message?: unknown };
      const message = typeof entry.message === "string" ? entry.message : error.message;
      const path = Array.isArray(entry.path)
        ? entry.path.join(".")
        : typeof entry.path === "string"
          ? entry.path
          : "_form";
      out[path] ??= message;
    }
  }
  if (Object.keys(out).length === 0) out._form = error.message;
  return out;
}
