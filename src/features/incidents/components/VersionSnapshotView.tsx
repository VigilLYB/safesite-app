import { formatDateTime } from "@/lib/format";
import { Card, KeyValue, Row, Stack, Text } from "@/components/ui";
import { QueryBoundary } from "@/components/feedback";
import { SeverityBadge, StatusPill } from "@/components/domain";
import { useIncidentVersion } from "../hooks/useIncidents";

/** The exact state of a report at one timeline node. */
export function VersionSnapshotView({
  incidentId,
  version,
}: {
  incidentId: string;
  version: number | null;
}) {
  const query = useIncidentVersion(incidentId, version);
  if (version === null) return null;
  return (
    <QueryBoundary query={query}>
      {(node) => (
        <Card tone="subtle">
          <Stack gap={2}>
            <Text variant="label">
              {node.label} · v{node.version}
            </Text>
            <Text variant="caption" tone="muted">
              {node.actor.fullName} · {formatDateTime(node.createdAt)}
            </Text>
            <Text variant="heading">{node.snapshot.title ?? "Untitled report"}</Text>
            <Row gap={2} wrap>
              <SeverityBadge severity={node.snapshot.severity} />
              <StatusPill status={node.snapshot.status} />
            </Row>
            {node.snapshot.description ? <Text>{node.snapshot.description}</Text> : null}
            <Row gap={5} wrap>
              <KeyValue label="Category" value={node.snapshot.category ?? "Not set"} />
              <KeyValue label="Area" value={node.snapshot.location.areaName ?? "Not set"} />
            </Row>
            {node.note ? <Text variant="caption">Note: {node.note}</Text> : null}
          </Stack>
        </Card>
      )}
    </QueryBoundary>
  );
}
