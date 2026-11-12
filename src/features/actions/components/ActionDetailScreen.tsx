import { useState } from "react";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { isApiError } from "@/lib/api";
import { displayTitle, formatDateTime, formatDate } from "@/lib/format";
import { actionStatusLabel, actionTypeLabel } from "@/lib/labels";
import { canProgressAction, nextMilestoneId } from "@/lib/permissions";
import { isUuid } from "@/lib/validation";
import {
  Badge,
  Button,
  Card,
  KeyValueGrid,
  Row,
  Screen,
  ScreenHeader,
  Section,
  Stack,
  Text,
} from "@/components/ui";
import {
  Banner,
  DetailSkeleton,
  ErrorState,
  InlineNotice,
  MutationError,
  RecordNotFound,
} from "@/components/feedback";
import { SeverityBadge, StatusPill } from "@/components/domain";
import { useSession } from "@/features/auth";
import { useAction, useCompleteAction, useCompleteMilestone } from "../hooks/useActions";
import { progressLabel } from "./ActionCard";

/** Action detail (guide §4.7): milestones in order; only the assignee or staff can progress. */
export function ActionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const actionId = String(id);
  const { user } = useSession();
  const query = useAction(actionId);
  const milestone = useCompleteMilestone();
  const complete = useCompleteAction();
  const [confirm, setConfirm] = useState<"last" | "oneoff" | null>(null);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/actions" as Href));
  const action = query.data;
  const canProgress = action ? canProgressAction(user, action) : false;
  const next = action ? nextMilestoneId(action) : null;
  const milestones = [...(action?.milestones ?? [])].sort((a, b) => a.seq - b.seq);
  const remaining = milestones.filter((m) => !m.completedAt).length;
  const justResolved = action?.status === "DONE" && action.incident.status === "RESOLVED";

  return (
    <Screen
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching}
      testID="action-detail"
    >
      <ScreenHeader title={action?.title ?? "Action"} onBack={back} />
      {!isUuid(actionId) ? <RecordNotFound what="action" /> : null}
      {isUuid(actionId) && query.isPending ? <DetailSkeleton /> : null}
      {query.isError && !action ? (
        isApiError(query.error) && query.error.kind === "notFound" ? (
          <RecordNotFound what="action" />
        ) : (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        )
      ) : null}
      {action ? (
        <Stack gap={4}>
          {justResolved ? (
            <Banner icon="check" message="Incident resolved" testID="resolved" />
          ) : null}
          <Row gap={2} wrap>
            <Badge
              label={actionStatusLabel[action.status]}
              tone={action.status === "DONE" ? "inverse" : "neutral"}
              icon={action.status === "DONE" ? "check" : undefined}
            />
            <Badge label={actionTypeLabel[action.type]} />
            {action.templateCode ? <Badge label={action.templateCode} /> : null}
            {action.isOverdue && action.status !== "DONE" ? (
              <Badge label="Overdue" tone="inverse" icon="warn" />
            ) : null}
          </Row>
          {action.description ? <Text>{action.description}</Text> : null}
          <KeyValueGrid
            testID="action-facts"
            items={[
              { label: "Assignee", value: action.assignee?.fullName ?? "Unassigned" },
              { label: "Assigned by", value: action.assignedBy.fullName },
              { label: "Due", value: formatDate(action.dueAt) },
              { label: "Progress", value: progressLabel(action) },
              { label: "Created", value: formatDateTime(action.createdAt) },
              { label: "Completed", value: formatDateTime(action.completedAt) },
            ]}
          />
          <Card
            onPress={() => router.push(`/incidents/${action.incident.id}` as Href)}
            accessibilityLabel="Open the report"
            testID="action-incident"
          >
            <Text variant="label">Report: {displayTitle(action.incident)}</Text>
            <Row gap={2} wrap>
              <SeverityBadge severity={action.incident.severity} size="sm" />
              <StatusPill status={action.incident.status} />
              <Text variant="caption" tone="muted">
                {action.incident.areaName ?? "—"}
              </Text>
            </Row>
          </Card>

          {!canProgress && action.status !== "DONE" && action.status !== "CANCELLED" ? (
            <InlineNotice message="Only the assignee or a supervisor can update this action." />
          ) : null}

          {milestones.length > 0 ? (
            <Section title="Milestones">
              {milestones.map((m, index) => {
                const previous = milestones[index - 1];
                const isNext = m.id === next;
                const done = Boolean(m.completedAt);
                return (
                  <Card key={m.id} tone={done ? "subtle" : "surface"} testID={`milestone-${m.seq}`}>
                    <Row justify="space-between" gap={2}>
                      <Text variant="label" style={{ flex: 1 }}>
                        {m.seq}. {m.title}
                      </Text>
                      {done ? <Badge label="Done" tone="inverse" icon="check" /> : null}
                      {m.isOverdue && !done ? (
                        <Badge label="Overdue" tone="inverse" icon="warn" />
                      ) : null}
                    </Row>
                    <Text variant="caption" tone="muted">
                      {done
                        ? `Completed ${formatDateTime(m.completedAt)}${m.completedBy ? ` by ${m.completedBy.fullName}` : ""}`
                        : `Due ${formatDate(m.dueAt)}`}
                    </Text>
                    {canProgress && !done ? (
                      <Button
                        label="Mark done"
                        size="desk"
                        disabled={!isNext}
                        loading={milestone.isPending && milestone.variables?.milestoneId === m.id}
                        accessibilityHint={
                          !isNext && previous ? `Complete '${previous.title}' first` : undefined
                        }
                        onPress={() =>
                          remaining === 1
                            ? setConfirm("last")
                            : milestone.mutate({ actionId: action.id, milestoneId: m.id })
                        }
                        testID={`mark-done-${m.seq}`}
                      />
                    ) : null}
                    {canProgress && !done && !isNext && previous ? (
                      <Text variant="caption" tone="muted">
                        Complete ‘{previous.title}’ first
                      </Text>
                    ) : null}
                  </Card>
                );
              })}
            </Section>
          ) : null}

          {canProgress && action.progress.total === 0 ? (
            <Button
              label="Mark action complete"
              loading={complete.isPending}
              onPress={() => setConfirm("oneoff")}
              testID="complete-action"
            />
          ) : null}

          {confirm ? (
            <Card tone="subtle" testID="confirm-complete">
              <Text variant="label">
                {confirm === "last"
                  ? "This finishes the action and marks the incident Resolved."
                  : "This marks the incident Resolved."}
              </Text>
              <Row gap={2}>
                <Button
                  label="Confirm"
                  size="desk"
                  loading={milestone.isPending || complete.isPending}
                  onPress={() => {
                    const done = () => setConfirm(null);
                    if (confirm === "last" && next) {
                      milestone.mutate(
                        { actionId: action.id, milestoneId: next },
                        { onSettled: done },
                      );
                    } else {
                      complete.mutate(action.id, { onSettled: done });
                    }
                  }}
                  testID="confirm-complete-yes"
                />
                <Button
                  label="Cancel"
                  variant="tertiary"
                  size="desk"
                  onPress={() => setConfirm(null)}
                />
              </Row>
            </Card>
          ) : null}
          <MutationError error={milestone.error ?? complete.error} />
        </Stack>
      ) : null}
    </Screen>
  );
}
