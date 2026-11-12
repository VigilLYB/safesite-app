import { RouteGuard } from "@/components/shell";
import { ReportScreen } from "@/features/report";

export default function Report() {
  return (
    <RouteGuard routeKey="report">
      <ReportScreen />
    </RouteGuard>
  );
}
