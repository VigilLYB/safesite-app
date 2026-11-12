import { RoleTabsLayout } from "@/components/shell";

export { RouteError as ErrorBoundary } from "@/components/feedback";

export default function WorkerLayout() {
  return (
    <RoleTabsLayout
      role="WORKER"
      tabs={[
        { name: "index", title: "Home", icon: "home" },
        { name: "report", title: "Report", icon: "plus" },
        { name: "reports", title: "My reports", icon: "list" },
        { name: "profile", title: "Profile", icon: "user" },
      ]}
    />
  );
}
