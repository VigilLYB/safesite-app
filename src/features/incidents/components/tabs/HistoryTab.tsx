import { useRouter, type Href } from "expo-router";
import { formatDateTime } from "@/lib/format";
import { actorRoleLabel, changedFieldGroups } from "@/lib/labels";
import { Badge, Button, Card, Row, Stack, Text } from "@/components/ui";
import { QueryBoundary } from "@/components/feedback";
import { StatusPill } from "@/components/domain";
import { useIncidentTimeline } from "../../hooks/useIncidents";

const REASON_NODES = new Set(["REJECTED", "REOPENED"]);

/** The same nodes as the timeline bar, as a list with the note ("Reason" on reject/reopen). */
export function HistoryTab({ incidentId }: { incidentId: string }) {
  const router = useRouter();
  const query = useIncidentTimeline(incidentId);
  return (
    <QueryBoundary query={query}>
      {(timeline) => (
        <Stack gap={3} testID="tab-history">
          {timeline.nodes.map((node) => (
            <Card key={node.versionId} testID={`history-${node.version}`}>
              <Row justify="space-between" gap={2}>
                <Text variant="label">{node.label}</Text>
                <Text variant="mono" tone="muted">
                  v{node.version}
                </Text>
              </Row>
              <Text variant="caption" tone="muted">
                {node.actor.role === "SYSTEM" ? actorRoleLabel.SYSTEM : node.actor.fullName} (
                {actorRoleLabel[node.actor.role as keyof typeof actorRoleLabel] ?? node.actor.role})
                · {formatDateTime(node.createdAt)}
              </Text>
              {node.note ? (
                <Text variant="caption">
                  {REASON_NODES.has(node.nodeType) ? "Reason: " : "Note: "}
                  {node.note}
                </Text>
              ) : null}
              <Row gap={2} wrap>
                <StatusPill status={node.status} />
                {changedFieldGroups(node.changedFields).map((group) => (
                  <Badge key={group} label={group} />
                ))}
              </Row>
              <Button
                label="View this version"
                variant="tertiary"
                size="desk"
                onPress={() =>
                  router.push(`/incidents/${incidentId}/versions/${node.version}` as Href)
                }
              />
            </Card>
          ))}
        </Stack>
      )}
    </QueryBoundary>
  );
}
