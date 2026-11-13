import { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { Action } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { nextMilestoneId } from "@/lib/permissions";
import { palette, radii } from "@/lib/theme";
import { Badge, Button, Card, Icon, Row, Section, Stack, Text } from "@/components/ui";
import { MutationError } from "@/components/feedback";
import { useCompleteAction, useCompleteMilestone } from "../hooks/useActions";

export interface ActionProgressProps {
  action: Action;
  /** The assignee or staff, on a live action. */
  canProgress: boolean;
}

/**
 * Marking work done (guide §4.7), as a checklist. Done steps are compact, the next step is the
 * only one with a button, later steps are listed without controls. Finishing the last step (or a
 * one-off action) asks for confirmation right where the button was, because it resolves the report.
 */
export function ActionProgress({ action, canProgress }: ActionProgressProps) {
  const milestone = useCompleteMilestone();
  const complete = useCompleteAction();
  const [confirming, setConfirming] = useState(false);
  const busy = milestone.isPending || complete.isPending;
  const milestones = [...(action.milestones ?? [])].sort((a, b) => a.seq - b.seq);
  const next = nextMilestoneId(action);
  const remaining = milestones.filter((m) => !m.completedAt).length;
  const { done, total } = action.progress;

  const finishStep = (milestoneId: string) => {
    complete.reset();
    milestone.mutate(
      { actionId: action.id, milestoneId },
      { onSuccess: () => setConfirming(false) },
    );
  };
  const finishOneOff = () => {
    milestone.reset();
    complete.mutate(action.id, { onSuccess: () => setConfirming(false) });
  };

  const confirmBox = (onConfirm: () => void, error: unknown) => (
    <Stack gap={2} testID="confirm-complete">
      <Text variant="label">This finishes the action and marks the report Resolved.</Text>
      <MutationError error={error} />
      <Row gap={2}>
        <Button
          label="Confirm"
          size="desk"
          loading={busy}
          onPress={onConfirm}
          testID="confirm-complete-yes"
        />
        <Button
          label="Cancel"
          variant="tertiary"
          size="desk"
          disabled={busy}
          onPress={() => setConfirming(false)}
        />
      </Row>
    </Stack>
  );

  if (total === 0) {
    if (!canProgress) return null;
    return (
      <Card testID="one-off-progress">
        {confirming ? (
          confirmBox(finishOneOff, complete.error)
        ) : (
          <Stack gap={2}>
            <Text tone="muted">One-off fix: mark it complete once the work is done.</Text>
            <Button
              label="Mark action complete"
              icon="check"
              onPress={() => {
                complete.reset();
                setConfirming(true);
              }}
              testID="complete-action"
            />
          </Stack>
        )}
      </Card>
    );
  }

  return (
    <Section title="Milestones">
      <Stack gap={2}>
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: total, now: done }}
          accessibilityLabel={`${done} of ${total} milestones done`}
        >
          <View style={[styles.fill, { width: `${(done / total) * 100}%` }]} />
        </View>
        <Text variant="caption" tone="muted">
          {done} of {total} done
        </Text>
      </Stack>
      <Stack gap={2}>
        {milestones.map((m) => {
          const isDone = Boolean(m.completedAt);
          const isNext = m.id === next;
          const isLast = isNext && remaining === 1;
          return (
            <Card
              key={m.id}
              tone={isDone ? "subtle" : "surface"}
              testID={`milestone-${m.seq}`}
              selected={isNext && canProgress}
            >
              <Row gap={2} align="center">
                <View style={[styles.dot, isDone && styles.dotDone]}>
                  {isDone ? (
                    <Icon name="check" size={14} color={palette.onInk} />
                  ) : (
                    <Text variant="caption">{m.seq}</Text>
                  )}
                </View>
                <View style={styles.flex}>
                  <Text variant="label" tone={isDone || !isNext ? "muted" : "default"}>
                    {m.title}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {isDone
                      ? `Done ${formatDateTime(m.completedAt)}${m.completedBy ? ` by ${m.completedBy.fullName}` : ""}`
                      : m.dueAt
                        ? `Due ${formatDate(m.dueAt)}`
                        : "No due date"}
                  </Text>
                </View>
                {m.isOverdue && !isDone ? (
                  <Badge label="Overdue" tone="inverse" icon="warn" />
                ) : null}
              </Row>
              {canProgress && isNext ? (
                isLast && confirming ? (
                  confirmBox(() => finishStep(m.id), milestone.error)
                ) : (
                  <Stack gap={2}>
                    <Button
                      label={isLast ? "Mark done and finish" : "Mark done"}
                      icon="check"
                      size="desk"
                      loading={!isLast && milestone.isPending}
                      disabled={busy}
                      onPress={() => {
                        milestone.reset();
                        if (isLast) setConfirming(true);
                        else finishStep(m.id);
                      }}
                      testID={`mark-done-${m.seq}`}
                    />
                    {!isLast ? <MutationError error={milestone.error} /> : null}
                  </Stack>
                )
              ) : null}
            </Card>
          );
        })}
      </Stack>
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  track: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: palette.grey200,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: palette.ink },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: palette.grey400,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: { backgroundColor: palette.ink, borderColor: palette.ink },
});
