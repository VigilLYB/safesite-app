import { useState } from "react";
import { Button, Card, Stack, Text } from "@/components/ui";
import { QueryBoundary } from "@/components/feedback";
import { IncidentActionsPanel } from "@/features/actions";
import { useIncident } from "../hooks/useIncidents";
import { DuplicatesPanel } from "./DuplicatesPanel";
import { EditIncidentSheet } from "./EditIncidentSheet";
import { IncidentLocationBlock } from "./IncidentLocationBlock";
import { IncidentMediaBlock } from "./IncidentMediaBlock";
import { IncidentSummaryBlock } from "./IncidentSummaryBlock";
import { PpeScanPanel } from "./PpeScanPanel";
import { TransitionPanel } from "./TransitionPanel";
import { VersionTimeline } from "./VersionTimeline";

/**
 * Everything about one report. What a person can do is decided by `incident.permissions`,
 * which the server computes for their role and the report's current state.
 */
export function IncidentDetail({ id }: { id: string }) {
  const query = useIncident(id);
  const [editing, setEditing] = useState(false);

  return (
    <QueryBoundary query={query}>
      {(incident) => (
        <Stack gap={4}>
          <IncidentSummaryBlock incident={incident} />
          {incident.permissions.canEdit ? (
            <Button
              label="Edit report"
              variant="secondary"
              size="desk"
              icon="clip"
              onPress={() => setEditing(true)}
            />
          ) : null}
          <IncidentMediaBlock incident={incident} />
          <IncidentLocationBlock incident={incident} />
          <TransitionPanel incident={incident} />
          <IncidentActionsPanel incident={incident} />
          <DuplicatesPanel incident={incident} />
          <PpeScanPanel incident={incident} />
          <Card>
            <Stack gap={3}>
              <Text variant="label">History</Text>
              <VersionTimeline incidentId={incident.id} />
            </Stack>
          </Card>
          <EditIncidentSheet
            incident={incident}
            visible={editing}
            onClose={() => setEditing(false)}
          />
        </Stack>
      )}
    </QueryBoundary>
  );
}
