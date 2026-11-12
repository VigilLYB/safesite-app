import { ActionsScreen } from "@/features/actions";
import { useRoleRoutes } from "@/features/auth";

export default function ManagerActions() {
  const routes = useRoleRoutes();
  return <ActionsScreen onOpenIncident={routes.openIncident} />;
}
