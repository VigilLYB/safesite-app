import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Redirect, Tabs, usePathname, type Href } from "expo-router";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useQuery } from "@tanstack/react-query";
import { healthApi, healthKeys, type Role } from "@/lib/api";
import { clock } from "@/lib/clock";
import { formatTime } from "@/lib/format";
import { navFor, routes, type RouteKey } from "@/lib/routes";
import { useBreakpoint } from "@/lib/responsive";
import { palette, space } from "@/lib/theme";
import { AppSkeleton, Banner, ServiceUnavailableScreen } from "@/components/feedback";
import { HeaderExtraProvider } from "@/components/ui";
import { useAlerts } from "@/features/alerts";
import { useSession } from "@/features/auth";
import { useOfflineSync } from "@/features/report";
import { PhoneTabBar } from "./PhoneTabBar";
import { ReportHeaderButton } from "./ReportHeaderButton";
import { tabIcon, useRoleTabOptions } from "./useRoleTabs";

const SESSION_WARNING_MS = 5 * 60_000;

/** Guide §2.8: persistent "Demo mode" banner when the backend runs simulated AI. */
export function DemoModeBanner() {
  const health = useQuery({
    queryKey: healthKeys.all,
    queryFn: ({ signal }) => healthApi.get(signal),
    staleTime: Infinity,
    retry: false,
  });
  if (health.data?.aiProvider !== "mock") return null;
  return (
    <Banner
      tone="inverse"
      icon="warn"
      message="Demo mode: transcription, duplicate detection and PPE results are simulated."
      testID="demo-banner"
    />
  );
}

/** Guide §2.1: five minutes before the 12 h token ends, a non-blocking notice. */
export function SessionEndingBanner({ expiresAt }: { expiresAt: string | null }) {
  const [now, setNow] = useState(() => clock.nowMs());
  useEffect(() => {
    const timer = setInterval(() => setNow(clock.nowMs()), 30_000);
    return () => clearInterval(timer);
  }, []);
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end) || end - now > SESSION_WARNING_MS || end <= now) return null;
  return (
    <Banner
      icon="history"
      message={`Your session ends at ${formatTime(expiresAt)}. Save your work.`}
      testID="session-ending"
    />
  );
}

const SEGMENTS: readonly RouteKey[] = [
  "report",
  "incidents",
  "actions",
  "alerts",
  "analytics",
  "team",
  "blueprints",
  "account",
];

function RoleTabs({ user }: { user: { id: string; role: Role } }) {
  const role = user.role;
  const options = useRoleTabOptions();
  // The badge on the Alerts tab: how many alerts the person has not looked at yet.
  const { unreadCount } = useAlerts(user);
  const { isTablet } = useBreakpoint();
  const nav = navFor(role, { compact: !isTablet });
  const listed = new Set(nav.map((item) => item.key));
  const hidden = SEGMENTS.filter((key) => !listed.has(key));
  return (
    <Tabs
      screenOptions={options}
      // Phones get the custom bar (sliding indicator, no ripple); tablets keep the sidebar.
      {...(isTablet ? {} : { tabBar: (props: BottomTabBarProps) => <PhoneTabBar {...props} /> })}
    >
      {nav.map((item) => (
        <Tabs.Screen
          key={item.key}
          name={item.segment}
          options={{
            title: item.navLabel,
            tabBarIcon: tabIcon(item.icon),
            tabBarAccessibilityLabel:
              item.key === "alerts" && unreadCount > 0
                ? `${item.navLabel}, ${unreadCount} unread`
                : item.navLabel,
            tabBarButtonTestID: `tab-${item.key}`,
            ...(item.key === "alerts" && unreadCount > 0 ? { tabBarBadge: unreadCount } : {}),
          }}
        />
      ))}
      {hidden.map((key) => (
        <Tabs.Screen
          key={key}
          name={routes[key].segment}
          // Not `href: null`: that removes the route, and a deep link would silently land on the
          // first tab. The route must exist so its guard can show Forbidden.
          options={{ tabBarButton: () => null, tabBarItemStyle: { display: "none" } }}
        />
      ))}
    </Tabs>
  );
}

/**
 * The signed-in frame: loads the session (guide §2.1 boot sequence), redirects the signed-out to
 * login with `next`, shows banners, and renders the navigation for the person's role.
 */
export function AppShell() {
  const { state, user, expiresAt, retryBoot } = useSession();
  const pathname = usePathname();
  const offline = useOfflineSync();

  if (state.status === "loading") {
    return (
      <View style={styles.root}>
        <AppSkeleton />
      </View>
    );
  }
  if (state.status === "unavailable") return <ServiceUnavailableScreen onRetry={retryBoot} />;
  if (!user) {
    const next =
      state.status === "signedOut" && state.reason === "expired" && pathname !== "/"
        ? `?next=${encodeURIComponent(pathname)}`
        : "";
    const reason = state.status === "signedOut" && state.reason ? `reason=${state.reason}` : "";
    const query = [next.replace("?", ""), reason].filter(Boolean).join("&");
    return <Redirect href={`/login${query ? `?${query}` : ""}` as Href} />;
  }

  // Managers get a Report button at the top right of every page header (not on the Report page).
  const managerReport =
    user.role === "MANAGER" && !pathname.startsWith("/report") ? <ReportHeaderButton /> : null;

  return (
    <View style={styles.root}>
      <View style={styles.banners}>
        <DemoModeBanner />
        <SessionEndingBanner expiresAt={expiresAt} />
        {offline.pending > 0 ? (
          <Banner
            icon="warn"
            message={`${offline.pending} report${offline.pending === 1 ? "" : "s"} saved on this device — sending when connected.`}
            testID="offline-queue-banner"
          />
        ) : null}
      </View>
      <HeaderExtraProvider value={managerReport}>
        <RoleTabs user={user} />
      </HeaderExtraProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.page },
  banners: { gap: space[1], paddingHorizontal: space[2] },
});
