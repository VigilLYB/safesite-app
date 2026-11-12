import type { Incident } from "@/lib/api";
import { formatDateTime, formatRelative, shortId } from "@/lib/format";
import { severityTokens } from "@/lib/theme";
import { Card, KeyValue, Row, Stack, Text } from "@/components/ui";
import { SeverityBadge, StatusPill } from "@/components/domain";

export function IncidentSummaryBlock({ incident }: { incident: Incident }) {
  return (
    <Card edgeColor={severityTokens[incident.severity].fill}>
      <Stack gap={2}>
        <Text variant="mono" tone="muted">
          {shortId(incident.id)} · v{incident.version}
        </Text>
        <Text variant="title" accessibilityRole="header">
          {incident.title?.trim() || "Untitled report"}
        </Text>
        <Row gap={2} wrap>
          <SeverityBadge severity={incident.severity} />
          <StatusPill status={incident.status} />
        </Row>
        {incident.description ? <Text>{incident.description}</Text> : null}
        <Row gap={5} wrap>
          <KeyValue label="Reported by" value={incident.reporter.fullName} />
          <KeyValue label="Submitted" value={formatDateTime(incident.createdAt)} />
          <KeyValue label="Category" value={incident.category ?? "Not set"} />
        </Row>
        <Text variant="caption" tone="muted">
          Last change: {incident.lastChange.label} ({incident.lastChange.actorRole.toLowerCase()},{" "}
          {formatRelative(incident.lastChange.at)})
        </Text>
      </Stack>
    </Card>
  );
}
