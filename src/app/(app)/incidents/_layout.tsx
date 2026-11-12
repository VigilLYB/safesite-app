import { Stack } from "expo-router";
import { palette } from "@/lib/theme";
import { RouteGuard } from "@/components/shell";

export default function Layout() {
  return (
    <RouteGuard routeKey="incidents">
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.page } }}
      />
    </RouteGuard>
  );
}
