import { useRouter, type Href } from "expo-router";
import { roleHome } from "@/lib/permissions";
import { useSession } from "../SessionProvider";

/** Navigation that stays inside the viewer's own role group. */
export function useRoleRoutes() {
  const router = useRouter();
  const { user } = useSession();
  const base = user ? roleHome[user.role] : "/login";

  return {
    home: () => router.replace(base as Href),
    to: (path: string) => router.push(`${base}/${path}` as Href),
    openIncident: (id: string) => router.push(`${base}/incident/${id}` as Href),
    /** Back, or the role home when the screen was opened by a deep link. */
    back: () => (router.canGoBack() ? router.back() : router.replace(base as Href)),
  };
}
