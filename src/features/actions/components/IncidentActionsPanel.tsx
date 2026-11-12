import { useState } from "react";
import type { Incident } from "@/lib/api";
import { Button, Card, Stack, Text } from "@/components/ui";
import { ErrorState } from "@/components/feedback";
import { useActions } from "../hooks/useActions";
import { ActionCard } from "./ActionCard";
import { AssignActionSheet } from "./AssignActionSheet";

/** Corrective actions for one report, plus the control to assign a new one. */
export function IncidentActionsPanel({ incident }: { incident: Incident }) {
  const [assigning, setAssigning] = useState(false);
  const actions = useActions({ incidentId: incident.id });
  const items = actions.data ?? [];
  const canAssign = incident.permissions.canAssignAction;
  if (!canAssign && items.length === 0 && !actions.isError) return null;

  return (
    <Card tone="subtle">
      <Stack gap={3}>
        <Text variant="label">Corrective actions</Text>
        {actions.isError ? (
          <ErrorState error={actions.error} onRetry={() => void actions.refetch()} />
        ) : null}
        {items.map((action) => (
          <ActionCard key={action.id} action={action} />
        ))}
        {canAssign ? (
          <Button
            label="Assign an action"
            size="desk"
            icon="plus"
            onPress={() => setAssigning(true)}
          />
        ) : null}
      </Stack>
      <AssignActionSheet
        incident={incident}
        visible={assigning}
        onClose={() => setAssigning(false)}
      />
    </Card>
  );
}
