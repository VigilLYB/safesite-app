import { request } from "../client";
import { endpoints } from "../registry";
import { usersListSchema, type Role } from "../schemas";

export const usersApi = {
  list: async (role?: Role, signal?: AbortSignal) =>
    (await request({ endpoint: endpoints.users, query: { role }, schema: usersListSchema, signal }))
      .items,
};
