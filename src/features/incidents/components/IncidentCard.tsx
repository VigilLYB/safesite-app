import { View } from "react-native";
import type { IncidentSummary } from "@/lib/api";
import { formatRelative, shortId } from "@/lib/format";
import { severityTokens, space } from "@/lib/theme";
import { Badge, Card, Row, Text } from "@/components/ui";
import { SeverityBadge, StatusPill } from "@/components/domain";

export interface IncidentCardProps {
  incident: IncidentSummary;
  onPress: (incident: IncidentSummary) => void;
  selected?: boolean;
}

/** One report in a list: id, place, time, title, then severity, status and duplicates. */
export function IncidentCard({ incident, onPress, selected = false }: IncidentCardProps) {
  const title = incident.title?.trim() || "Untitled report";
  return (
    <Card
      onPress={() => onPress(incident)}
      selected={selected}
      edgeColor={severityTokens[incident.severity].fill}
      accessibilityLabel={`${title}. ${incident.severity.toLowerCase()} severity. ${incident.status.toLowerCase()}.`}
      testID={`incident-${incident.id}`}
    >
      <Row justify="space-between">
        <Text variant="mono" tone="muted">
          {shortId(incident.id)}
        </Text>
        <Text variant="caption" tone="muted">
          {formatRelative(incident.createdAt)}
        </Text>
      </Row>
      <Text variant="heading">{title}</Text>
      <Text variant="caption" tone="muted">
        {incident.areaName ?? "Location not set"} · {incident.reporter.fullName}
      </Text>
      <View style={{ paddingTop: space[1] }}>
        <Row gap={2} wrap>
          <SeverityBadge severity={incident.severity} />
          <StatusPill status={incident.status} />
          {incident.duplicateCount > 0 ? (
            <Badge
              label={`${incident.duplicateCount} duplicate${incident.duplicateCount === 1 ? "" : "s"}`}
              icon="link"
            />
          ) : null}
        </Row>
      </View>
    </Card>
  );
}
