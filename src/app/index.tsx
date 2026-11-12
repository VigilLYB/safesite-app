import { Redirect, type Href } from "expo-router";
import { useSession } from "@/features/auth";
import { useBreakpoint } from "@/lib/responsive";
import { homeFor } from "@/lib/routes";

/** Entry: decide where this person belongs. Unknown state waits; no session means login. */
export default function Index() {
  const { state, user } = useSession();
  const { isTablet } = useBreakpoint();
  if (state.status === "loading") return null;
  return <Redirect href={(user ? homeFor(user.role, !isTablet) : "/login") as Href} />;
}
