import { Screen, ScreenHeader } from "@/components/ui";
import { useRoleRoutes } from "@/features/auth";
import { IncidentDetail } from "./IncidentDetail";

/** Full-screen report page used by every role (phones, and deep links). */
export function IncidentScreen({ id }: { id: string }) {
  const routes = useRoleRoutes();
  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <ScreenHeader title="Report" onBack={routes.back} />
      <IncidentDetail id={id} />
    </Screen>
  );
}
