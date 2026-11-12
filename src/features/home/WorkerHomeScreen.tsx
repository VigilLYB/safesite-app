import { useSession, useRoleRoutes } from "@/features/auth";
import { IncidentCard, useIncidentList } from "@/features/incidents";
import { Button, Screen, ScreenHeader, Section, Stack } from "@/components/ui";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/feedback";

/** Worker home: one big action, then the status of what they already reported. */
export function WorkerHomeScreen() {
  const { user } = useSession();
  const routes = useRoleRoutes();
  const recent = useIncidentList({ mine: true, limit: 5 });
  const items = recent.data?.pages[0]?.items ?? [];
  const firstName = user?.fullName.split(" ")[0] ?? "there";

  return (
    <Screen onRefresh={() => void recent.refetch()} refreshing={recent.isRefetching}>
      <ScreenHeader eyebrow="Plant X" title={`Hello, ${firstName}`} />
      <Button
        label="Report a hazard"
        icon="camera"
        fullWidth
        onPress={() => routes.to("report")}
        testID="home-report"
      />
      <Section
        title="My recent reports"
        action={
          <Button
            label="See all"
            variant="tertiary"
            size="desk"
            onPress={() => routes.to("reports")}
          />
        }
      >
        {recent.isPending ? (
          <ListSkeleton rows={3} />
        ) : recent.isError && items.length === 0 ? (
          <ErrorState error={recent.error} onRetry={() => void recent.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="shield"
            title="No reports yet"
            message="If you see something unsafe, report it. It takes under a minute."
          />
        ) : (
          <Stack gap={2}>
            {items.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                onPress={() => routes.openIncident(incident.id)}
              />
            ))}
          </Stack>
        )}
      </Section>
    </Screen>
  );
}
