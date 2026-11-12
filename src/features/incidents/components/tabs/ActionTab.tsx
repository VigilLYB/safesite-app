import { useRouter, type Href } from "expo-router";
import type { Incident } from "@/lib/api";
import { Button, Stack, Text } from "@/components/ui";
import { EmptyState, QueryBoundary } from "@/components/feedback";
import { ActionCard } from "@/features/actions";
import { useIncidentActions } from "../../hooks/useIncidents";

export function ActionTab({ incident, onAssign }: { incident: Incident; onAssign: () => void }) {
  const router = useRouter();
  const query = useIncidentActions(incident.id, true);
  const waiting = incident.status === "OPEN" || incident.status === "VALIDATED";
  return (
    <QueryBoundary
      query={query}
      isEmpty={(items) => items.length === 0}
      empty={
        <Stack gap={3} testID="tab-action-empty">
          <EmptyState
            icon="tasks"
            title={waiting ? "An action can be assigned after approval" : "No action"}
          />
          {incident.permissions.canAssignAction ? (
            <Button label="Assign action" onPress={onAssign} size="desk" testID="tab-assign" />
          ) : null}
        </Stack>
      }
    >
      {(items) => (
        <Stack gap={3} testID="tab-action">
          <Text variant="caption" tone="muted">
            The active action first, then past actions.
          </Text>
          {items.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              onPress={(item) => router.push(`/actions/${item.id}` as Href)}
            />
          ))}
        </Stack>
      )}
    </QueryBoundary>
  );
}
