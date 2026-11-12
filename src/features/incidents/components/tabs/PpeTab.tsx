import type { Incident } from "@/lib/api";
import { formatDateTime, formatPercent } from "@/lib/format";
import { ppeEquipmentLabel, ppeVerdictLabel } from "@/lib/labels";
import { Badge, Button, Card, Row, Stack, Text } from "@/components/ui";
import { EmptyState, MutationError, QueryBoundary } from "@/components/feedback";
import { useIncidentTimeline, usePpeScans } from "../../hooks/useIncidents";

export interface PpeTabProps {
  incident: Incident;
  onRun: () => void;
  running: boolean;
  error: unknown;
}

/** Newest first: verdict, people, per-person equipment, which version and photo were scanned. */
export function PpeTab({ incident, onRun, running, error }: PpeTabProps) {
  const query = usePpeScans(incident.id, true);
  const timeline = useIncidentTimeline(incident.id);
  const versionNumber = (versionId: string) =>
    timeline.data?.nodes.find((node) => node.versionId === versionId)?.version;

  return (
    <Stack gap={3} testID="tab-ppe">
      {incident.permissions.canRunPpeScan ? (
        <Button
          label="Run PPE scan"
          icon="shield"
          size="desk"
          loading={running}
          onPress={onRun}
          testID="ppe-run"
        />
      ) : null}
      {running ? (
        <Text variant="caption" tone="muted">
          Scanning photo…
        </Text>
      ) : null}
      <MutationError error={error} />
      <QueryBoundary
        query={query}
        isEmpty={(items) => items.length === 0}
        empty={<EmptyState icon="shield" title="No PPE scans yet" />}
      >
        {(scans) => (
          <Stack gap={3}>
            {scans.map((scan) => {
              const v = versionNumber(scan.versionId);
              return (
                <Card key={scan.id} testID={`ppe-${scan.id}`}>
                  <Row gap={2} wrap>
                    <Badge
                      label={ppeVerdictLabel[scan.summary.verdict]}
                      tone={scan.summary.verdict === "VIOLATION" ? "inverse" : "neutral"}
                      icon={scan.summary.verdict === "COMPLIANT" ? "check" : "warn"}
                    />
                    {scan.isMock ? <Badge label="Simulated AI result" /> : null}
                    {scan.photoKey !== incident.photo?.key ? <Badge label="Earlier photo" /> : null}
                  </Row>
                  <Text variant="caption" tone="muted">
                    AI result · {scan.summary.personsDetected} people detected,{" "}
                    {scan.summary.personsWithViolations} with violations · scanned{" "}
                    {formatDateTime(scan.createdAt)}
                    {v ? ` · version ${v}` : ""}
                  </Text>
                  {scan.summary.persons.map((person) => (
                    <Text key={person.personId} variant="caption">
                      Person {person.personId + 1} ({formatPercent(person.confidence / 100)}):{" "}
                      {person.missingEquipment.length > 0
                        ? `missing ${person.missingEquipment.map((e) => ppeEquipmentLabel[e] ?? e).join(", ")}`
                        : "nothing missing"}
                      {person.detectedEquipment.length > 0
                        ? ` · detected ${person.detectedEquipment.map((e) => ppeEquipmentLabel[e] ?? e).join(", ")}`
                        : ""}
                    </Text>
                  ))}
                </Card>
              );
            })}
          </Stack>
        )}
      </QueryBoundary>
    </Stack>
  );
}
