import { RouteGuard } from "@/components/shell";
import { AccountScreen } from "@/features/account";

export default function Account() {
  return (
    <RouteGuard routeKey="account">
      <AccountScreen />
    </RouteGuard>
  );
}
