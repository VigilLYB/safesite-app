import { ActionsScreen } from "@/features/actions";
import { useRoleRoutes } from "@/features/auth";

export default function SupervisorActions() {
  const routes = useRoleRoutes();
  return <ActionsScreen onOpenIncident={routes.openIncident} />;
}
