import { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { Action } from "@/lib/api";
import { formatDate, humanize } from "@/lib/format";
import { palette, radii, severityTokens, space } from "@/lib/theme";
import { Badge, Button, Card, KeyValue, Row, Stack, Text } from "@/components/ui";
import { MutationError } from "@/components/feedback";
import { SeverityBadge } from "@/components/domain";
import { useSession } from "@/features/auth";
import { useCompleteAction, useCompleteMilestone } from "../hooks/useActions";

export interface ActionCardProps {
  action: Action;
  onOpenIncident?: (incidentId: string) => void;
}

const ACTIVE = ["OPEN", "IN_PROGRESS"];

/** A corrective action with its progress and, when the viewer may, the next step. */
export function ActionCard({ action, onOpenIncident }: ActionCardProps) {
  const { user } = useSession();
  const milestone = useCompleteMilestone();
  const complete = useCompleteAction();
  const [open, setOpen] = useState(false);

  const active = ACTIVE.includes(action.status);
  const mayAct = Boolean(user) && (user?.role !== "WORKER" || user?.id === action.assignee?.id);
  const next = action.milestones?.find((item) => item.completedAt === null);
  const ratio = action.progress.total > 0 ? action.progress.done / action.progress.total : 0;

  return (
    <Card edgeColor={severityTokens[action.incident.severity].fill}>
      <Stack gap={2}>
        <Row justify="space-between" gap={2} align="flex-start">
          <Text variant="heading" style={styles.flex}>
            {action.title}
          </Text>
          <Badge
            label={humanize(action.status)}
            tone={action.status === "DONE" ? "inverse" : "neutral"}
            icon={action.status === "DONE" ? "check" : undefined}
          />
        </Row>
        <Text variant="caption" tone="muted">
          For: {action.incident.title ?? "Untitled report"}
          {action.incident.areaName ? ` · ${action.incident.areaName}` : ""}
        </Text>
        <Row gap={2} wrap>
          <SeverityBadge severity={action.incident.severity} showPips={false} />
          {action.isOverdue ? <Badge label="Overdue" tone="inverse" icon="warn" /> : null}
        </Row>
        <Row gap={5} wrap>
          <KeyValue label="Assignee" value={action.assignee?.fullName ?? "Unassigned"} />
          <KeyValue label="Due" value={formatDate(action.dueAt)} />
          <KeyValue label="Assigned by" value={action.assignedBy.fullName} />
        </Row>
        {action.progress.total > 0 ? (
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`${action.progress.done} of ${action.progress.total} milestones done`}
            style={styles.progressWrap}
          >
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
            </View>
            <Text variant="caption" tone="muted">
              {action.progress.done} of {action.progress.total} milestones
            </Text>
          </View>
        ) : null}

        {open && action.milestones ? (
          <Stack gap={1}>
            {action.milestones.map((item) => (
              <Row key={item.id} gap={2} align="flex-start">
                <Text variant="mono">{item.completedAt ? "[x]" : "[ ]"}</Text>
                <Text style={styles.flex}>
                  {item.title}
                  <Text variant="caption" tone="muted">
                    {" "}
                    · due {formatDate(item.dueAt)}
                    {item.isOverdue && !item.completedAt ? " · overdue" : ""}
                  </Text>
                </Text>
              </Row>
            ))}
          </Stack>
        ) : null}

        <Row gap={2} wrap>
          {action.milestones && action.milestones.length > 0 ? (
            <Button
              label={open ? "Hide milestones" : "Show milestones"}
              variant="tertiary"
              size="desk"
              onPress={() => setOpen((value) => !value)}
            />
          ) : null}
          {active && mayAct && next ? (
            <Button
              label="Complete next milestone"
              size="desk"
              icon="check"
              loading={milestone.isPending}
              onPress={() => milestone.mutate({ actionId: action.id, milestoneId: next.id })}
            />
          ) : null}
          {active && mayAct && action.type === "ONE_OFF" ? (
            <Button
              label="Mark done"
              size="desk"
              icon="check"
              loading={complete.isPending}
              onPress={() => complete.mutate(action.id)}
            />
          ) : null}
          {onOpenIncident ? (
            <Button
              label="Open report"
              variant="secondary"
              size="desk"
              onPress={() => onOpenIncident(action.incident.id)}
            />
          ) : null}
        </Row>
        <MutationError error={milestone.error ?? complete.error} />
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progressWrap: { gap: space[1] },
  track: {
    height: 8,
    backgroundColor: palette.grey200,
    borderRadius: radii.control,
    overflow: "hidden",
  },
  fill: { height: 8, backgroundColor: palette.ink },
});
