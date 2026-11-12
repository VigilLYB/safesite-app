import { z } from "zod";
import { roleSchema } from "./common";

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  role: roleSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal("Bearer"),
  expiresAt: z.string(),
  user: userSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const usersListSchema = z.object({ items: z.array(userSchema) });
