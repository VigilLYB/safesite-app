import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { isApiError } from "@/lib/api";
import { displayTitle, formatDateTime, formatDate } from "@/lib/format";
import { actionStatusLabel, actionTypeLabel } from "@/lib/labels";
import { canProgressAction, canReassignAction } from "@/lib/permissions";
import { isUuid } from "@/lib/validation";
import { Badge, Card, KeyValueGrid, Row, Screen, ScreenHeader, Stack, Text } from "@/components/ui";
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
import { UserPicker } from "@/features/users";
import { useAction, useReassignAction } from "../hooks/useActions";
import { progressLabel } from "./ActionCard";
import { ActionProgress } from "./ActionProgress";

/** Action detail (guide §4.7): milestones in order; only the assignee or staff can progress. */
export function ActionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const actionId = String(id);
  const { user } = useSession();
  const query = useAction(actionId);
  const reassign = useReassignAction();

  const back = () => (router.canGoBack() ? router.back() : router.replace("/actions" as Href));
  const action = query.data;
  const canProgress = action ? canProgressAction(user, action) : false;
  const canReassign = action ? canReassignAction(user, action) : false;
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
          {canReassign ? (
            <Stack gap={2} testID="reassign">
              <UserPicker
                label="Change assignee"
                role="SUPERVISOR"
                showOpenActions
                anyLabel="Unassigned"
                value={action.assignee?.id ?? null}
                onChange={(assigneeId) => {
                  if (assigneeId !== (action.assignee?.id ?? null)) {
                    reassign.mutate({ actionId: action.id, assigneeId });
                  }
                }}
                helper={
                  reassign.isPending ? "Saving…" : "The change is recorded in the report's history."
                }
                testID="reassign-picker"
              />
              <MutationError error={reassign.error} />
            </Stack>
          ) : null}
          <Card
            onPress={() => router.push(`/actions/report/${action.incident.id}` as Href)}
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

          <ActionProgress action={action} canProgress={canProgress} />
        </Stack>
      ) : null}
    </Screen>
  );
}
