import { request } from "../client";
import { endpoints } from "../registry";
import { userSchema, usersListSchema, type Role } from "../schemas";

export interface CreateUserInput {
  email: string;
  fullName: string;
  role: Role;
  password: string;
}

export const usersApi = {
  list: async (role?: Role, signal?: AbortSignal) =>
    (await request({ endpoint: endpoints.users, query: { role }, schema: usersListSchema, signal }))
      .items,
  create: (body: CreateUserInput) =>
    request({ endpoint: endpoints.userCreate, body, schema: userSchema }),
};
