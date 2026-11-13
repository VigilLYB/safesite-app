import type { IncidentSummary } from "@/lib/api";
import { displayTitle, formatRelative, shortId } from "@/lib/format";
import { Badge, Button, Card, Row, Stack, Text } from "@/components/ui";
import { SeverityBadge, StatusPill } from "@/components/domain";

export interface IncidentCardProps {
  incident: IncidentSummary;
  onPress: (incident: IncidentSummary) => void;
  /** Staff see who reported it; a worker only ever sees their own reports. */
  showReporter?: boolean | undefined;
  /** A worker's duplicate row links to the parent report. */
  onOpenParent?: ((parentId: string) => void) | undefined;
}

/**
 * One report in a list. Top: reference, severity (right). Then title and place. Bottom: status,
 * duplicate / "+N linked" / high-confidence "PPE missing" badges, time (right).
 */
export function IncidentCard({
  incident,
  onPress,
  showReporter = false,
  onOpenParent,
}: IncidentCardProps) {
  const title = displayTitle(incident);
  const linked = incident.duplicateCount;
  return (
    <Card
      onPress={() => onPress(incident)}
      accessibilityLabel={`${title}. ${incident.severity.toLowerCase()} severity. ${incident.status.toLowerCase().replace("_", " ")}.${linked > 0 ? ` ${linked} linked report${linked === 1 ? "" : "s"}.` : ""}${incident.ppeViolation ? " PPE missing." : ""}`}
      testID={`incident-${incident.id}`}
    >
      <Row justify="space-between" gap={2}>
        <Text variant="mono" tone="muted">
          {shortId(incident.id)}
        </Text>
        <SeverityBadge severity={incident.severity} />
      </Row>
      <Stack gap={1}>
        <Text variant="heading">{title}</Text>
        <Text variant="caption" tone="muted">
          {incident.areaName ?? "—"}
          {showReporter ? ` · ${incident.reporter.fullName}` : ""}
        </Text>
      </Stack>
      <Row justify="space-between" align="flex-end" gap={2}>
        <Row gap={2} wrap style={{ flex: 1 }}>
          <StatusPill status={incident.status} />
          {incident.clusterParentId ? <Badge label="Duplicate" icon="link" /> : null}
          {linked > 0 ? <Badge label={`+${linked}`} icon="link" /> : null}
          {/* Only a very confident AI result; anything weaker stays on the report's PPE tab. */}
          {incident.ppeViolation ? (
            <Badge label="PPE missing" icon="shield" tone="inverse" />
          ) : null}
        </Row>
        <Text variant="caption" tone="muted">
          {formatRelative(incident.createdAt)}
        </Text>
      </Row>
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
