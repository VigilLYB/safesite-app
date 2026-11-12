import type { Incident, PpeScan } from "@/lib/api";
import { formatDateTime, humanize } from "@/lib/format";
import { Badge, Button, Card, Stack, Text } from "@/components/ui";
import { MutationError } from "@/components/feedback";
import { useRunPpeScan } from "../hooks/useIncidentMutations";
import { usePpeScans } from "../hooks/useIncidents";

const VERDICT: Record<PpeScan["summary"]["verdict"], string> = {
  COMPLIANT: "Compliant",
  VIOLATION: "PPE missing",
  NO_PERSONS: "No people in photo",
};

/** AI check of the report photo for helmet, gloves and face cover. */
export function PpeScanPanel({ incident }: { incident: Incident }) {
  const scans = usePpeScans(incident.id);
  const run = useRunPpeScan();
  const canRun = incident.permissions.canRunPpeScan && incident.photo !== null;
  const items = scans.data ?? [];
  if (!canRun && items.length === 0) return null;

  return (
    <Card>
      <Stack gap={3}>
        <Text variant="label">PPE check</Text>
        {canRun ? (
          <Button
            label="Run PPE check on photo"
            variant="secondary"
            size="desk"
            icon="shield"
            loading={run.isPending}
            onPress={() => run.mutate(incident.id)}
          />
        ) : null}
        <MutationError error={run.error} />
        {items.map((scan) => (
          <Stack key={scan.id} gap={1}>
            <Badge
              label={VERDICT[scan.summary.verdict]}
              tone={scan.summary.verdict === "VIOLATION" ? "inverse" : "neutral"}
              icon={scan.summary.verdict === "VIOLATION" ? "warn" : "check"}
            />
            <Text variant="caption" tone="muted">
              {scan.summary.personsDetected} detected, {scan.summary.personsWithViolations} with
              missing PPE · {formatDateTime(scan.createdAt)}
              {scan.isMock ? " · demo result" : ""}
            </Text>
            {scan.summary.persons
              .filter((person) => person.missingEquipment.length > 0)
              .map((person) => (
                <Text key={person.personId} variant="caption">
                  Person {person.personId}: missing{" "}
                  {person.missingEquipment.map(humanize).join(", ").toLowerCase()}
                </Text>
              ))}
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
