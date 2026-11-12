import { useRouter, type Href } from "expo-router";
import { useUnclusterIncident } from "../../hooks/useIncidentMutations";
import { useIncidentDuplicates } from "../../hooks/useIncidents";
import { isApiError, type IncidentSummary } from "@/lib/api";
import { displayTitle, formatRelative, shortId } from "@/lib/format";
import { canOpenDuplicateRow, canUnlinkDuplicate } from "@/lib/permissions";
import { Button, Card, Row, Stack, Text } from "@/components/ui";
import { MutationError, QueryBoundary } from "@/components/feedback";
import { SeverityBadge, StatusPill } from "@/components/domain";
import { useSession } from "@/features/auth";

export interface DuplicatesTabProps {
  /** Reports linked under this parent. For the Thread tab, the report's own parent. */
  parentId: string;
  /** Thread = viewed from a duplicate; the current report is hidden from its siblings. */
  mode: "duplicates" | "thread";
  currentId: string;
}

/**
 * Guide §4.4: workers can open only rows they reported; other rows are plain text. Staff get
 * Unlink per row, sent with that row's own version.
 */
export function DuplicatesTab({ parentId, mode, currentId }: DuplicatesTabProps) {
  const router = useRouter();
  const { user } = useSession();
  const query = useIncidentDuplicates(parentId, true);
  const uncluster = useUnclusterIncident();

  const renderRow = (row: IncidentSummary) => {
    const openable = canOpenDuplicateRow(user, row);
    const body = (
      <>
        <Text variant="mono" tone="muted">
          {shortId(row.id)}
        </Text>
        <Text variant="label">{displayTitle(row)}</Text>
        <Text variant="caption" tone="muted">
          {row.reporter.fullName} · {formatRelative(row.createdAt)}
        </Text>
        <Row gap={2} wrap>
          <SeverityBadge severity={row.severity} size="sm" />
          <StatusPill status={row.status} />
        </Row>
      </>
    );
    return openable ? (
      <Card
        key={row.id}
        onPress={() => router.push(`/incidents/${row.id}` as Href)}
        testID={`dup-${row.id}`}
      >
        {body}
        {mode === "duplicates" && canUnlinkDuplicate(user?.role) ? (
          <Button
            label="Unlink"
            variant="secondary"
            size="desk"
            loading={uncluster.isPending && uncluster.variables?.id === row.id}
            onPress={() => uncluster.mutate({ id: row.id, parentId, expectedVersion: row.version })}
            testID={`unlink-${row.id}`}
          />
        ) : null}
      </Card>
    ) : (
      <Card key={row.id} testID={`dup-${row.id}`}>
        {body}
      </Card>
    );
  };

  return (
    <QueryBoundary
      query={query}
      isEmpty={(data) => data.items.filter((item) => item.id !== currentId).length === 0}
    >
      {(data) => (
        <Stack gap={3} testID={mode === "thread" ? "tab-thread" : "tab-duplicates"}>
          {mode === "thread" ? (
            <Button
              label="Open parent report"
              variant="secondary"
              size="desk"
              icon="link"
              onPress={() => router.push(`/incidents/${data.parentIncidentId}` as Href)}
            />
          ) : null}
          {data.items.filter((item) => item.id !== currentId).map(renderRow)}
          <MutationError error={uncluster.error} />
          {isApiError(uncluster.error) && uncluster.error.code === "STALE_VERSION" ? (
            <Text variant="caption" tone="muted">
              Refresh the list and try again.
            </Text>
          ) : null}
        </Stack>
      )}
    </QueryBoundary>
  );
}
