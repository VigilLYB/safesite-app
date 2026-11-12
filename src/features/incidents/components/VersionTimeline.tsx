import { Pressable, StyleSheet, View } from "react-native";
import { formatDateTime, humanize } from "@/lib/format";
import { palette, radii, space } from "@/lib/theme";
import { Badge, Icon, Row, Stack, Text } from "@/components/ui";
import { QueryBoundary } from "@/components/feedback";
import { StatusPill } from "@/components/domain";
import { useIncidentTimeline } from "../hooks/useIncidents";

export interface VersionTimelineProps {
  incidentId: string;
  selectedVersion?: number | null;
  onSelect?: (version: number) => void;
}

/** Immutable history: Worker Submitted, Supervisor Modified, Approved... newest last. */
export function VersionTimeline({ incidentId, selectedVersion, onSelect }: VersionTimelineProps) {
  const query = useIncidentTimeline(incidentId);
  return (
    <QueryBoundary query={query}>
      {(timeline) => (
        <Stack gap={1}>
          {timeline.nodes.map((node, index) => {
            const last = index === timeline.nodes.length - 1;
            const selected = node.version === selectedVersion;
            const body = (
              <View style={[styles.row, selected && styles.selected]}>
                <View style={styles.rail}>
                  <View style={[styles.dot, last && styles.dotCurrent]}>
                    {!last ? <Icon name="check" size={12} color={palette.onInk} /> : null}
                  </View>
                  {!last ? <View style={styles.line} /> : null}
                </View>
                <Stack gap={1} style={styles.flex}>
                  <Row justify="space-between" gap={2}>
                    <Text variant="label" style={styles.flex}>
                      {node.label}
                    </Text>
                    <Text variant="mono" tone="muted">
                      v{node.version}
                    </Text>
                  </Row>
                  <Text variant="caption" tone="muted">
                    {node.actor.fullName} ({humanize(node.actor.role).toLowerCase()}) ·{" "}
                    {formatDateTime(node.createdAt)}
                  </Text>
                  {node.note ? <Text variant="caption">{node.note}</Text> : null}
                  <Row gap={2} wrap>
                    <StatusPill status={node.status} />
                    {node.changedFields.map((field) => (
                      <Badge key={field} label={humanize(field)} />
                    ))}
                  </Row>
                </Stack>
              </View>
            );
            return onSelect ? (
              <Pressable
                key={node.versionId}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${node.label}, version ${node.version}`}
                onPress={() => onSelect(node.version)}
              >
                {body}
              </Pressable>
            ) : (
              <View key={node.versionId}>{body}</View>
            );
          })}
        </Stack>
      )}
    </QueryBoundary>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: space[3],
    paddingVertical: space[2],
    paddingHorizontal: space[2],
    borderRadius: radii.control,
  },
  selected: { backgroundColor: palette.grey100 },
  rail: { alignItems: "center", width: 20 },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  dotCurrent: { backgroundColor: palette.surface, borderWidth: 5, borderColor: palette.ink },
  line: { flex: 1, width: 2, backgroundColor: palette.grey300, marginTop: 2 },
  flex: { flex: 1 },
});
