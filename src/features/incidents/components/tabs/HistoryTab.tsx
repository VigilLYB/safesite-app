import { useState } from "react";
import { useRouter, type Href } from "expo-router";
import { formatDateTime } from "@/lib/format";
import { actorRoleLabel, changedFieldGroups } from "@/lib/labels";
import { isApiError, userMessage } from "@/lib/api";
import { canExportAudit } from "@/lib/permissions";
import { Badge, Button, Card, Row, Stack, Text } from "@/components/ui";
import { FieldNotice, QueryBoundary } from "@/components/feedback";
import { StatusPill } from "@/components/domain";
import { useSession } from "@/features/auth";
import { useIncidentTimeline } from "../../hooks/useIncidents";
import { exportAuditCsv } from "../../lib/export-audit";

const REASON_NODES = new Set(["REJECTED", "REOPENED"]);

/** The same nodes as the timeline bar, as a list with the note ("Reason" on reject/reopen). */
export function HistoryTab({ incidentId }: { incidentId: string }) {
  const router = useRouter();
  const { user } = useSession();
  const query = useIncidentTimeline(incidentId);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const onExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await exportAuditCsv(incidentId);
    } catch (error) {
      setExportError(
        isApiError(error) ? userMessage(error) : "The export could not be downloaded.",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <QueryBoundary query={query}>
      {(timeline) => (
        <Stack gap={3} testID="tab-history">
          {canExportAudit(user?.role) ? (
            <Card testID="audit-export">
              <Stack gap={2}>
                <Text variant="label">Audit export</Text>
                <Text variant="caption" tone="muted">
                  The full history of this report as CSV, with the tamper-evidence chain checked.
                </Text>
                <FieldNotice message={exportError} />
                <Button
                  label="Export audit (CSV)"
                  variant="secondary"
                  size="desk"
                  icon="history"
                  loading={exporting}
                  onPress={onExport}
                  testID="export-audit-button"
                />
              </Stack>
            </Card>
          ) : null}
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
