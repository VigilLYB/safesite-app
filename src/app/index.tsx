import { Redirect } from "expo-router";
import { useSession } from "@/features/auth";
import { roleHome } from "@/lib/permissions";

/** Entry: decide where this person belongs. Unknown state waits; no session means login. */
export default function Index() {
  const { state, user } = useSession();
  if (state.status === "loading") return null;
  return <Redirect href={user ? roleHome[user.role] : "/login"} />;
}
