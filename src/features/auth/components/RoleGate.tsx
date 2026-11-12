import type { ReactNode } from "react";
import { Redirect } from "expo-router";
import type { Role } from "@/lib/api";
import { roleHome } from "@/lib/permissions";
import { useSession } from "../SessionProvider";

/**
 * Wraps a role's route group. The server is the real gate; this only keeps a signed-in person
 * out of another role's layout. Unknown state denies: signed out goes to login.
 */
export function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const { state, user } = useSession();
  if (state.status === "loading") return null;
  if (!user) return <Redirect href="/login" />;
  if (user.role !== role) return <Redirect href={roleHome[user.role]} />;
  return <>{children}</>;
}
