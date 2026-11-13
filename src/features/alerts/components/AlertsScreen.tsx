import { useCallback, useEffect, useRef } from "react";
import { useRouter, useFocusEffect, type Href } from "expo-router";
import { formatRelative } from "@/lib/format";
import { Badge, Button, Card, Icon, Row, Screen, ScreenHeader, Stack, Text } from "@/components/ui";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/feedback";
import { useSession } from "@/features/auth";
import { useAlerts } from "../hooks/useAlerts";

/**
 * Alerts: what needs the person's attention, newest first. Unread ones are marked while the screen
 * is open and count as read when they leave it (or press "Mark all read").
 */
export function AlertsScreen() {
  const router = useRouter();
  const { user } = useSession();
  const feed = useAlerts(user ? { id: user.id, role: user.role } : null);
  const unreadIds = new Set(feed.unread.map((alert) => alert.id));

  // Marking happens on blur, using the latest feed (a stale closure would mark the wrong set).
  const latest = useRef(feed.markAllRead);
  useEffect(() => {
    latest.current = feed.markAllRead;
  }, [feed.markAllRead]);
  useFocusEffect(useCallback(() => () => latest.current(), []));

  return (
    <Screen
      onRefresh={() => void feed.refetch()}
      refreshing={feed.isRefetching}
      testID="alerts-screen"
    >
      <ScreenHeader
        title="Alerts"
        subtitle="What needs your attention."
        actions={
          feed.unreadCount > 0 ? (
            <Button
              label="Mark all read"
              variant="secondary"
              size="desk"
              onPress={feed.markAllRead}
              testID="mark-all-read"
            />
          ) : undefined
        }
      />
      {feed.isPending ? <ListSkeleton rows={4} /> : null}
      {feed.isError && feed.alerts.length === 0 ? (
        <ErrorState error={feed.error} onRetry={() => void feed.refetch()} />
      ) : null}
      {feed.isSuccess && feed.alerts.length === 0 ? (
        <EmptyState icon="bell" title="You're all caught up" message="New alerts show up here." />
      ) : null}
      <Stack gap={3}>
        {feed.alerts.map((alert) => {
          const unread = unreadIds.has(alert.id);
          return (
            <Card
              key={alert.id}
              onPress={() => router.push(alert.href as Href)}
              accessibilityLabel={`${unread ? "New. " : ""}${alert.title}. ${alert.body}`}
              testID={`alert-${alert.id}`}
            >
              <Row gap={3} align="flex-start">
                <Icon name={alert.icon} size={22} />
                <Stack gap={1} style={{ flex: 1 }}>
                  <Row justify="space-between" gap={2}>
                    <Text variant="label" style={{ flex: 1 }}>
                      {alert.title}
                    </Text>
                    {unread ? <Badge label="New" tone="inverse" /> : null}
                  </Row>
                  <Text>{alert.body}</Text>
                  <Text variant="caption" tone="muted">
                    {formatRelative(alert.at)}
                  </Text>
                </Stack>
              </Row>
            </Card>
          );
        })}
      </Stack>
    </Screen>
  );
}
