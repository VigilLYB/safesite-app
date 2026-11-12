import { RouteGuard } from "@/components/shell";
import { AlertsScreen } from "@/features/alerts";

export default function Alerts() {
  return (
    <RouteGuard routeKey="alerts">
      <AlertsScreen />
    </RouteGuard>
  );
}
