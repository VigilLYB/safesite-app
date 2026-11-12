import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useUnclusterIncident } from "../hooks/useIncidentMutations";
import { useIncidentDuplicates } from "../hooks/useIncidents";
import { isApiError, type IncidentSummary } from "@/lib/api";
import { displayTitle, formatRelative, shortId } from "@/lib/format";
import { canOpenDuplicateRow, canUnlinkDuplicate } from "@/lib/permissions";
import { palette, space } from "@/lib/theme";
import { Badge, Button, Card, Row, Section, Stack, Text } from "@/components/ui";
import { MutationError, QueryBoundary } from "@/components/feedback";
import { SeverityBadge, StatusPill } from "@/components/domain";
import { useSession } from "@/features/auth";

export interface LinkedReportsThreadProps {
  /** The report the others are linked under: this report, or (for a duplicate) its parent. */
  parentId: string;
  /** "children" = viewed from the parent; "siblings" = viewed from one of its duplicates. */
  mode: "children" | "siblings";
  currentId: string;
  /** Siblings mode: the parent's title, shown as the root of the thread. */
  parentTitle?: string | undefined;
}

const RAIL = 2;
const INDENT = space[4];
const ELBOW_DEPTH = 26;

/** One node of the thread: a thin rail on the left with a curved elbow into the card. */
function ThreadNode({ last, children }: { last: boolean; children: ReactNode }) {
  return (
    <View style={styles.node}>
      {last ? null : <View style={styles.rail} />}
      <View style={styles.elbow} />
      {children}
    </View>
  );
}

/**
 * Linked reports as a threaded list under the report (thin rails, like comment threads).
 * Workers can open only rows they reported; other rows are plain text. Staff get Unlink per row
 * (from the parent), sent with that row's own version.
 */
export function LinkedReportsThread({
  parentId,
  mode,
  currentId,
  parentTitle,
}: LinkedReportsThreadProps) {
  const router = useRouter();
  const { user } = useSession();
  const query = useIncidentDuplicates(parentId, true);
  const uncluster = useUnclusterIncident();

  const renderCard = (row: IncidentSummary) => {
    const isCurrent = row.id === currentId;
    const openable = !isCurrent && canOpenDuplicateRow(user, row);
    const body = (
      <Stack gap={1}>
        <Row justify="space-between" gap={2}>
          <Text variant="mono" tone="muted">
            {shortId(row.id)}
          </Text>
          <SeverityBadge severity={row.severity} size="sm" />
        </Row>
        <Text variant="label">{displayTitle(row)}</Text>
        <Row justify="space-between" gap={2} wrap>
          <Row gap={2} wrap>
            <StatusPill status={row.status} />
            {isCurrent ? <Badge label="This report" tone="inverse" /> : null}
          </Row>
          <Text variant="caption" tone="muted">
            {row.reporter.fullName} · {formatRelative(row.createdAt)}
          </Text>
        </Row>
        {mode === "children" && canUnlinkDuplicate(user?.role) ? (
          <Button
            label="Unlink"
            variant="secondary"
            size="desk"
            loading={uncluster.isPending && uncluster.variables?.id === row.id}
            onPress={() => uncluster.mutate({ id: row.id, parentId, expectedVersion: row.version })}
            testID={`unlink-${row.id}`}
          />
        ) : null}
      </Stack>
    );
    return openable ? (
      <Card
        onPress={() => router.push(`/incidents/${row.id}` as Href)}
        accessibilityLabel={`Linked report: ${displayTitle(row)}`}
        testID={`dup-${row.id}`}
      >
        {body}
      </Card>
    ) : (
      <Card tone={isCurrent ? "subtle" : "surface"} testID={`dup-${row.id}`}>
        {body}
      </Card>
    );
  };

  return (
    <QueryBoundary query={query} isEmpty={(data) => mode === "children" && data.items.length === 0}>
      {(data) => {
        const rows =
          mode === "children" ? data.items.filter((item) => item.id !== currentId) : data.items;
        return (
          <Section
            title={mode === "children" ? `Linked reports (${rows.length})` : "Linked under"}
            icon="link"
          >
            <View testID={mode === "siblings" ? "linked-thread" : "linked-reports"}>
              {mode === "siblings" ? (
                <Card
                  onPress={() => router.push(`/incidents/${data.parentIncidentId}` as Href)}
                  accessibilityLabel="Open the parent report"
                  testID="linked-parent"
                >
                  <Text variant="caption" tone="muted">
                    Parent report
                  </Text>
                  <Text variant="label">{parentTitle ?? "Open parent report"}</Text>
                </Card>
              ) : null}
              <View style={styles.thread}>
                {rows.map((row, index) => (
                  <ThreadNode key={row.id} last={index === rows.length - 1}>
                    {renderCard(row)}
                  </ThreadNode>
                ))}
              </View>
            </View>
            <MutationError error={uncluster.error} />
            {isApiError(uncluster.error) && uncluster.error.code === "STALE_VERSION" ? (
              <Text variant="caption" tone="muted">
                Refresh the list and try again.
              </Text>
            ) : null}
          </Section>
        );
      }}
    </QueryBoundary>
  );
}

const styles = StyleSheet.create({
  thread: { paddingLeft: INDENT + space[2], paddingTop: space[3], gap: space[3] },
  node: { position: "relative" },
  rail: {
    position: "absolute",
    left: -(INDENT + space[2]) + INDENT / 2,
    top: 0,
    bottom: -space[3],
    width: RAIL,
    backgroundColor: palette.grey300,
  },
  elbow: {
    position: "absolute",
    left: -(INDENT + space[2]) + INDENT / 2,
    top: -space[3],
    width: INDENT / 2 + space[2],
    height: ELBOW_DEPTH + space[3],
    borderLeftWidth: RAIL,
    borderBottomWidth: RAIL,
    borderBottomLeftRadius: space[2],
    borderColor: palette.grey300,
  },
});
