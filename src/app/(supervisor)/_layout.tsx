import { RoleTabsLayout } from "@/components/shell";

export { RouteError as ErrorBoundary } from "@/components/feedback";

export default function SupervisorLayout() {
  return (
    <RoleTabsLayout
      role="SUPERVISOR"
      tabs={[
        { name: "index", title: "Review queue", icon: "clip" },
        { name: "actions", title: "Actions", icon: "tasks" },
        { name: "profile", title: "Profile", icon: "user" },
      ]}
    />
  );
}
