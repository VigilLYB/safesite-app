import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userKeys, usersApi, type CreateUserInput, type Role } from "@/lib/api";

/** Active users (staff only), e.g. to pick an action assignee. */
export function useUsers(role?: Role, enabled = true) {
  return useQuery({
    queryKey: userKeys.list(role),
    queryFn: ({ signal }) => usersApi.list(role, signal),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateUserInput) => usersApi.create(body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}
