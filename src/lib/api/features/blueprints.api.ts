import { request } from "../client";
import { endpoints } from "../registry";
import { areaSchema, blueprintDetailSchema, blueprintListSchema, type GeoBounds } from "../schemas";

export interface CreateBlueprintInput {
  name: string;
  imageKey?: string | undefined;
  widthPx: number;
  heightPx: number;
  geoBounds?: GeoBounds | undefined;
  isDefault?: boolean | undefined;
}

export interface CreateAreaInput {
  name: string;
  polygon: [number, number][];
}

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
  create: (body: CreateBlueprintInput) =>
    request({ endpoint: endpoints.blueprintCreate, body, schema: blueprintDetailSchema }),
  addArea: (id: string, body: CreateAreaInput) =>
    request({ endpoint: endpoints.areaCreate, params: { id }, body, schema: areaSchema }),
};
