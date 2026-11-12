import { RouteGuard } from "@/components/shell";
import { TeamScreen } from "@/features/team";

export default function Team() {
  return (
    <RouteGuard routeKey="team">
      <TeamScreen />
    </RouteGuard>
  );
}
