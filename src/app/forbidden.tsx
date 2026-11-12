import { useRouter, type Href } from "expo-router";
import { ForbiddenScreen } from "@/components/feedback";
import { useSession } from "@/features/auth";
import { useBreakpoint } from "@/lib/responsive";
import { homeFor } from "@/lib/routes";

export default function Forbidden() {
  const router = useRouter();
  const { user } = useSession();
  const { isTablet } = useBreakpoint();
  return (
    <ForbiddenScreen
      onHome={() => router.replace((user ? homeFor(user.role, !isTablet) : "/login") as Href)}
    />
  );
}
