import { View } from "react-native";
import type { IncidentSummary } from "@/lib/api";
import { displayTitle, formatRelative, shortId } from "@/lib/format";
import { severityTokens, space } from "@/lib/theme";
import { Badge, Button, Card, Row, Text } from "@/components/ui";
import { SeverityBadge, StatusPill } from "@/components/domain";

export interface IncidentCardProps {
  incident: IncidentSummary;
  onPress: (incident: IncidentSummary) => void;
  /** Staff see who reported it; a worker only ever sees their own reports. */
  showReporter?: boolean | undefined;
  /** A worker's duplicate row links to the parent report. */
  onOpenParent?: ((parentId: string) => void) | undefined;
}

/** One report in a list: reference, place, time, title, then severity, status and duplicate badges. */
export function IncidentCard({
  incident,
  onPress,
  showReporter = false,
  onOpenParent,
}: IncidentCardProps) {
  const title = displayTitle(incident);
  return (
    <Card
      onPress={() => onPress(incident)}
      edgeColor={severityTokens[incident.severity].fill}
      accessibilityLabel={`${title}. ${incident.severity.toLowerCase()} severity. ${incident.status.toLowerCase().replace("_", " ")}.`}
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
        {incident.areaName ?? "—"}
        {showReporter ? ` · ${incident.reporter.fullName}` : ""}
      </Text>
      <View style={{ paddingTop: space[1] }}>
        <Row gap={2} wrap>
          <SeverityBadge severity={incident.severity} />
          <StatusPill status={incident.status} />
          {incident.clusterParentId ? <Badge label="Duplicate" icon="link" /> : null}
          {incident.duplicateCount > 0 ? (
            <Badge label={`+${incident.duplicateCount} similar`} />
          ) : null}
        </Row>
      </View>
      {incident.clusterParentId && onOpenParent ? (
        <Button
          label="Parent report"
          variant="tertiary"
          size="desk"
          onPress={() => onOpenParent(incident.clusterParentId as string)}
        />
      ) : null}
    </Card>
  );
}
