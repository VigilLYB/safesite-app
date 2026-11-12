import type { ReactNode } from "react";
import { useRouter, type Href } from "expo-router";
import { canAccess, homeFor, type RouteKey } from "@/lib/routes";
import { ForbiddenScreen } from "@/components/feedback";
import { useBreakpoint } from "@/lib/responsive";
import { useSession } from "@/features/auth";

/**
 * Each section's layout wraps its children in this (guide §3.3). A signed-in person whose role
 * can't use the route sees Forbidden, never the login page. Deny by default: no user, no render.
 */
export function RouteGuard({ routeKey, children }: { routeKey: RouteKey; children: ReactNode }) {
  const { user } = useSession();
  const router = useRouter();
  const { isTablet } = useBreakpoint();
  if (!user) return null;
  if (!canAccess(user.role, routeKey)) {
    return <ForbiddenScreen onHome={() => router.replace(homeFor(user.role, !isTablet) as Href)} />;
  }
  return <>{children}</>;
}
