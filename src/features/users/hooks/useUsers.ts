import { useQuery } from "@tanstack/react-query";
import { userKeys, usersApi, type Role } from "@/lib/api";

/** Active users, e.g. to pick an action assignee. */
export function useUsers(role?: Role, enabled = true) {
  return useQuery({
    queryKey: userKeys.list(role),
    queryFn: ({ signal }) => usersApi.list(role, signal),
    enabled,
    staleTime: 5 * 60_000,
  });
}
