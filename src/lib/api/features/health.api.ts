import { request } from "../client";
import { endpoints } from "../registry";
import { healthSchema } from "../schemas/health";

export const healthApi = {
  /** Public. Called once at boot to see whether AI results are simulated (`aiProvider: "mock"`). */
  get: (signal?: AbortSignal) =>
    request({ endpoint: endpoints.health, schema: healthSchema, auth: false, signal }),
};
