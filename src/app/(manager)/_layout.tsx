import { RoleTabsLayout } from "@/components/shell";

export { RouteError as ErrorBoundary } from "@/components/feedback";

export default function ManagerLayout() {
  return (
    <RoleTabsLayout
      role="MANAGER"
      tabs={[
        { name: "index", title: "Overview", icon: "chart" },
        { name: "heatmap", title: "Heatmap", icon: "map" },
        { name: "audit", title: "Audit history", icon: "history" },
        { name: "actions", title: "Actions", icon: "tasks" },
        { name: "profile", title: "Profile", icon: "user" },
      ]}
    />
  );
}
