import type { z } from "zod";
import { config } from "@/lib/config";
import { authBridge } from "./auth-bridge";
import { newId } from "@/lib/id";
import { toApiError } from "./client-errors";
import { ApiError } from "./errors";
import { buildPath, type Endpoint, type PathParams } from "./registry";

type QueryValue = string | number | boolean | null | undefined;
export type Query = Record<string, QueryValue>;

export interface RequestOptions<T> {
  endpoint: Endpoint;
  schema: z.ZodType<T>;
  params?: PathParams | undefined;
  query?: Query | undefined;
  body?: unknown;
  /** false for calls made before sign-in; a 401 there is a wrong password, not an expired session. */
  auth?: boolean | undefined;
  signal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function toQueryString(query: Query | undefined): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined; // e.g. an HTML error page from the gateway
  }
}

/**
 * After a 401 on an authenticated call: try one token refresh. Resolves true when the call should
 * be repeated with the new token; otherwise signs the person out and resolves false.
 */
async function recoverFromUnauthorized(usedToken: string | null): Promise<boolean> {
  if (usedToken) {
    const next = await authBridge.refresh(usedToken); // a network error here propagates
    if (next) return true;
  }
  authBridge.notifyUnauthorized();
  return false;
}

/** The only place the app talks HTTP to the SafeSite API. */
export async function request<T>(options: RequestOptions<T>, retried = false): Promise<T> {
  const { endpoint, schema, params, query, body, auth = true, signal } = options;
  const url = `${config.API_BASE_URL}${buildPath(endpoint, params)}${toQueryString(query)}`;

  const correlationId = newId();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Correlation-Id": correlationId,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = auth ? authBridge.getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(
    () => {
      timedOut = true;
      controller.abort();
    },
    options.timeoutMs ?? endpoint.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  let response: Response;
  try {
    response = await fetch(url, {
      method: endpoint.method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });
  } catch (cause) {
    if (timedOut) {
      throw new ApiError({
        status: 0,
        code: "TIMEOUT",
        message: "Request timed out",
        kind: "timeout",
      });
    }
    if (signal?.aborted) throw cause; // cancelled by the caller (e.g. a query unmount)
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Network request failed",
      kind: "network",
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }

  const payload = await readJson(response);

  if (!response.ok) {
    const error = toApiError(
      response.status,
      payload,
      response.headers.get("x-correlation-id") ?? correlationId,
    );
    if (error.kind === "unauthorized" && auth) {
      if (!retried && (await recoverFromUnauthorized(token))) return request(options, true);
      if (retried) authBridge.notifyUnauthorized();
    }
    throw error;
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError({
      status: response.status,
      code: "RESPONSE_INVALID",
      message: `Unexpected response from ${endpoint.template}`,
      kind: "unknown",
      details: parsed.error.issues.map((issue) => issue.path.join(".")),
    });
  }
  return parsed.data;
}

/** Like `request`, but for a non-JSON file response (e.g. the CSV audit export): no body, raw text out. */
export async function requestText(
  options: {
    endpoint: Endpoint;
    params?: PathParams | undefined;
    query?: Query | undefined;
    signal?: AbortSignal | undefined;
    timeoutMs?: number | undefined;
  },
  retried = false,
): Promise<string> {
  const { endpoint, params, query, signal } = options;
  const url = `${config.API_BASE_URL}${buildPath(endpoint, params)}${toQueryString(query)}`;

  const correlationId = newId();
  const headers: Record<string, string> = { "X-Correlation-Id": correlationId };
  const token = authBridge.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(
    () => {
      timedOut = true;
      controller.abort();
    },
    options.timeoutMs ?? endpoint.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  let response: Response;
  try {
    response = await fetch(url, { method: endpoint.method, headers, signal: controller.signal });
  } catch (cause) {
    if (timedOut) {
      throw new ApiError({
        status: 0,
        code: "TIMEOUT",
        message: "Request timed out",
        kind: "timeout",
      });
    }
    if (signal?.aborted) throw cause;
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Network request failed",
      kind: "network",
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }

  if (!response.ok) {
    const payload = await readJson(response);
    const error = toApiError(
      response.status,
      payload,
      response.headers.get("x-correlation-id") ?? correlationId,
    );
    if (error.kind === "unauthorized") {
      if (!retried && (await recoverFromUnauthorized(token))) return requestText(options, true);
      if (retried) authBridge.notifyUnauthorized();
    }
    throw error;
  }
  return response.text();
}
