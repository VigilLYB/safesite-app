import { z } from "zod";

export const blueprintSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageKey: z.string().nullable(),
  imageUrl: z.string().nullable(),
  widthPx: z.number().int(),
  heightPx: z.number().int(),
  isDefault: z.boolean(),
  createdAt: z.string(),
});
export type Blueprint = z.infer<typeof blueprintSchema>;
export const blueprintListSchema = z.object({ items: z.array(blueprintSchema) });

export const areaSchema = z.object({
  id: z.string(),
  blueprintId: z.string(),
  name: z.string(),
  polygon: z.array(z.tuple([z.number(), z.number()])),
});
export const blueprintDetailSchema = blueprintSchema.extend({ areas: z.array(areaSchema) });
export type BlueprintDetail = z.infer<typeof blueprintDetailSchema>;
