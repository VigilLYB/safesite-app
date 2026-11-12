import { request } from "../client";
import { endpoints } from "../registry";
import { blueprintDetailSchema, blueprintListSchema } from "../schemas";

export const blueprintsApi = {
  list: async (signal?: AbortSignal) =>
    (await request({ endpoint: endpoints.blueprints, schema: blueprintListSchema, signal })).items,
  get: (id: string, signal?: AbortSignal) =>
    request({
      endpoint: endpoints.blueprint,
      params: { id },
      schema: blueprintDetailSchema,
      signal,
    }),
};
