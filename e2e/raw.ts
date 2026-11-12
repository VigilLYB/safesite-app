import { z } from "zod";
import { request } from "@/lib/api/client";
import { endpoints } from "@/lib/api/registry";

/** Send an arbitrary body through the real client to prove the server's strictness. */
export { endpoints };
export const anything = z.unknown();
export function rawRequest(
  endpoint: (typeof endpoints)[keyof typeof endpoints],
  body: unknown,
  params?: Record<string, string>,
) {
  return request({ endpoint, body, params, schema: anything });
}
export { rawRequest as request };
