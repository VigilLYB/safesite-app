import type { Action } from "@/lib/api";
import { actionStatusLabel, actionTypeLabel } from "@/lib/labels";
import { displayTitle, formatDate } from "@/lib/format";
import { severityTokens } from "@/lib/theme";
import { Badge, Button, Card, Row, Text } from "@/components/ui";
import { SeverityBadge, StatusPill } from "@/components/domain";

export interface ActionCardProps {
  action: Action;
  onPress: (action: Action) => void;
  onOpenIncident?: ((incidentId: string) => void) | undefined;
}

/** progress `total === 0` is a one-off fix (guide §4.6). */
export function progressLabel(action: Pick<Action, "progress">): string {
  return action.progress.total === 0
    ? "One-off fix"
    : `${action.progress.done}/${action.progress.total} milestones`;
}

export function ActionCard({ action, onPress, onOpenIncident }: ActionCardProps) {
  const overdue = action.isOverdue && action.status !== "DONE";
  return (
    <Card
      onPress={() => onPress(action)}
      edgeColor={severityTokens[action.incident.severity].fill}
      accessibilityLabel={`${action.title}. ${actionStatusLabel[action.status]}.${overdue ? " Overdue." : ""}`}
      testID={`action-${action.id}`}
    >
      <Row justify="space-between" gap={2}>
        <Text variant="heading" style={{ flex: 1 }}>
          {action.title}
        </Text>
        {overdue ? <Badge label="Overdue" tone="inverse" icon="warn" /> : null}
      </Row>
      <Row gap={2} wrap>
        <Badge
          label={actionStatusLabel[action.status]}
          tone={action.status === "DONE" ? "inverse" : "neutral"}
          icon={action.status === "DONE" ? "check" : undefined}
        />
        <Badge label={actionTypeLabel[action.type]} />
        <Badge label={progressLabel(action)} />
      </Row>
      <Text variant="caption" tone="muted">
        {action.assignee ? `Assigned to ${action.assignee.fullName}` : "Unassigned"} · by{" "}
        {action.assignedBy.fullName}
      </Text>
      <Text variant="caption" tone="muted">
        Due {formatDate(action.dueAt)} · Created {formatDate(action.createdAt)}
      </Text>
      <Row gap={2} wrap>
        <SeverityBadge severity={action.incident.severity} showPips={false} />
        <StatusPill status={action.incident.status} />
        <Text variant="caption" tone="muted">
          {action.incident.areaName ?? "—"}
        </Text>
      </Row>
      {onOpenIncident ? (
        <Button
          label={`Report: ${displayTitle(action.incident)}`}
          variant="tertiary"
          size="desk"
          onPress={() => onOpenIncident(action.incident.id)}
        />
      ) : null}
    </Card>
  );
}
