import { z } from "zod";

export const healthSchema = z.object({
  status: z.string(),
  database: z.string().optional(),
  aiProvider: z.string().optional(),
  time: z.string().optional(),
});
export type Health = z.infer<typeof healthSchema>;
