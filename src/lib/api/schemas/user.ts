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

/** A row of GET /v1/users: the user plus how many live actions they hold. */
export const userListItemSchema = userSchema.extend({
  openActionCount: z.number().int().optional(),
});
export type UserListItem = z.infer<typeof userListItemSchema>;

export const usersListSchema = z.object({ items: z.array(userListItemSchema) });
