import type { IncidentVersionSnapshot } from "@/lib/api";
import { groupOfField, locationSourceLabel } from "@/lib/labels";
import { Card, KeyValue, Row, Stack, Text } from "@/components/ui";
import { SeverityBadge, StatusPill } from "@/components/domain";
import { BlueprintMap, useBlueprint } from "@/features/blueprints";

const fieldsOf = (group: string, changed: readonly string[]) =>
  changed.some((field) => groupOfField(field) === group);

/** The exact state at one version, read-only. Fields this node changed are highlighted. */
export function VersionSnapshot({
  version,
  changedFields,
}: {
  version: IncidentVersionSnapshot;
  changedFields: readonly string[];
}) {
  const s = version.snapshot;
  const plan = useBlueprint(s.location.blueprintId ?? undefined);
  const hot = (group: string) => fieldsOf(group, changedFields);
  const mark = (group: string, text: string) => (hot(group) ? `${text}  (changed)` : text);
  return (
    <Stack gap={4} testID="version-snapshot">
      <Row gap={2} wrap>
        <StatusPill status={s.status} />
        <SeverityBadge severity={s.severity} />
      </Row>
      <Card tone={hot("Title") || hot("Description") ? "subtle" : "surface"}>
        <Text variant="label">{mark("Title", s.title ?? "Untitled report")}</Text>
        {s.description ? <Text>{mark("Description", s.description)}</Text> : null}
      </Card>
      {s.transcript ? (
        <Card tone={hot("Transcript") ? "subtle" : "surface"}>
          <Text variant="label">{mark("Transcript", "Transcript (machine transcription)")}</Text>
          <Text>{s.transcript}</Text>
        </Card>
      ) : null}
      <Row gap={5} wrap>
        <KeyValue label={mark("Category", "Category")} value={s.category ?? "—"} />
        <KeyValue label={mark("Severity", "Severity")} value={s.severity} />
        <KeyValue
          label={mark("Location", "Location")}
          value={`${s.location.areaName ?? "No area"} · ${locationSourceLabel[s.location.source]}`}
        />
      </Row>
      {plan.data && s.location.x !== null && s.location.y !== null ? (
        <BlueprintMap
          blueprint={plan.data}
          accessibilityLabel="Pin at this version"
          areas={plan.data.areas.map((area) => ({
            ...area,
            highlighted: area.id === s.location.areaId,
          }))}
          pins={[{ id: "v", x: s.location.x, y: s.location.y, source: s.location.source }]}
          onImageError={() => void plan.refetch()}
        />
      ) : null}
    </Stack>
  );
}
