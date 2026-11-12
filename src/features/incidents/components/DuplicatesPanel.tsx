import { StyleSheet, View } from "react-native";
import type { Incident } from "@/lib/api";
import { formatPercent, shortId } from "@/lib/format";
import { palette, radii, space } from "@/lib/theme";
import { Button, Card, Row, Stack, Text } from "@/components/ui";
import { ErrorState, MutationError } from "@/components/feedback";
import { SeverityBadge } from "@/components/domain";
import { useClusterIncident, useUnclusterIncident } from "../hooks/useIncidentMutations";
import { useIncidentDuplicates, useSimilarIncidents } from "../hooks/useIncidents";

/** Duplicate detection: reports nested under this one, and AI-suggested parents for this one. */
export function DuplicatesPanel({ incident }: { incident: Incident }) {
  const { canCluster } = incident.permissions;
  const isDuplicate = incident.cluster.isDuplicate;
  const hasChildren = incident.duplicateCount > 0;
  const duplicates = useIncidentDuplicates(incident.id, hasChildren);
  const similar = useSimilarIncidents(incident.id, canCluster && !isDuplicate);
  const link = useClusterIncident();
  const unlink = useUnclusterIncident();

  if (!hasChildren && !isDuplicate && !(canCluster && (similar.data?.items.length ?? 0) > 0))
    return null;

  return (
    <Card>
      <Stack gap={3}>
        <Text variant="label">Duplicates</Text>

        {isDuplicate ? (
          <Stack gap={2}>
            <Text>
              Linked as a duplicate of{" "}
              <Text variant="mono">
                {incident.cluster.parentIncidentId
                  ? shortId(incident.cluster.parentIncidentId)
                  : "another report"}
              </Text>
              {incident.cluster.similarity !== null
                ? ` (${formatPercent(incident.cluster.similarity)} similar)`
                : ""}
              .
            </Text>
            {canCluster ? (
              <Button
                label="Unlink duplicate"
                variant="secondary"
                size="desk"
                icon="link"
                loading={unlink.isPending}
                onPress={() =>
                  unlink.mutate({ id: incident.id, expectedVersion: incident.version })
                }
              />
            ) : null}
            <MutationError error={unlink.error} />
          </Stack>
        ) : null}

        {hasChildren ? (
          duplicates.isError ? (
            <ErrorState error={duplicates.error} onRetry={() => void duplicates.refetch()} />
          ) : (
            <Stack gap={2}>
              <Text variant="caption" tone="muted">
                {incident.duplicateCount} report{incident.duplicateCount === 1 ? "" : "s"} grouped
                under this one
              </Text>
              {duplicates.data?.items.map((item) => (
                <View key={item.id} style={styles.row}>
                  <Text variant="mono">{shortId(item.id)}</Text>
                  <Text style={styles.flex}>{item.title ?? "Untitled report"}</Text>
                </View>
              ))}
            </Stack>
          )
        ) : null}

        {canCluster && !isDuplicate && similar.data && similar.data.items.length > 0 ? (
          <Stack gap={2}>
            <Text variant="caption" tone="muted">
              Possible parent reports (AI similarity)
            </Text>
            {similar.data.items.map((item) => (
              <View key={item.id} style={styles.suggestion}>
                <Row justify="space-between">
                  <Text variant="mono">{shortId(item.id)}</Text>
                  <Text variant="label">{formatPercent(item.similarity)}</Text>
                </Row>
                <Text>{item.title ?? "Untitled report"}</Text>
                <SeverityBadge severity={item.severity} showPips={false} />
                <Button
                  label="Mark as duplicate of this"
                  variant="secondary"
                  size="desk"
                  icon="link"
                  disabled={link.isPending}
                  onPress={() =>
                    link.mutate({
                      id: incident.id,
                      parentIncidentId: item.id,
                      expectedVersion: incident.version,
                    })
                  }
                />
              </View>
            ))}
            <MutationError error={link.error} />
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space[2], alignItems: "center" },
  flex: { flex: 1 },
  suggestion: {
    gap: space[2],
    backgroundColor: palette.grey100,
    borderRadius: radii.card,
    padding: space[3],
  },
});
