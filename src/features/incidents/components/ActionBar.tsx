import { StyleSheet, View } from "react-native";
import type { Incident, TransitionEvent } from "@/lib/api";
import { canUnlinkDuplicate, isStaff } from "@/lib/permissions";
import { space } from "@/lib/theme";
import { Button, IconButton, Row, Text } from "@/components/ui";
import { useSession } from "@/features/auth";

export type DialogKind =
  | { kind: "edit" }
  | { kind: "workflow"; event: TransitionEvent }
  | { kind: "link" }
  | { kind: "unlink" }
  | { kind: "assign" };

export interface ActionBarProps {
  incident: Incident;
  busy: boolean;
  onOpen: (dialog: DialogKind) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

/**
 * Workflow events the app offers. Validate is deliberately absent: approving is the single
 * review step (it no longer implies an action is due), and an action can be assigned any time
 * after approval. The API still knows `validate`; the app just never shows it.
 */
const WORKFLOW: Partial<Record<TransitionEvent, { label: string; positive: boolean }>> = {
  approve: { label: "Approve", positive: true },
  close: { label: "Close", positive: true },
  reopen: { label: "Reopen", positive: false },
  reject: { label: "Reject", positive: false },
};
const ORDER: readonly TransitionEvent[] = ["approve", "close", "reopen", "reject"];

interface Tile {
  key: string;
  label: string;
  onPress: () => void;
  icon?: "clip" | "link" | undefined;
  testID: string;
}

/**
 * Guide §4.4, laid out as a small grid: the next step as one full-width tile, everything else as
 * two-column tiles (editing and linking first, Reopen/Reject last). Every button comes from the
 * `permissions` object; the state machine is never re-derived here.
 */
export function ActionBar({ incident, busy, onOpen, onRefresh, refreshing }: ActionBarProps) {
  const { user } = useSession();
  const staff = isStaff(user?.role);
  const p = incident.permissions;
  const events = ORDER.filter((event) => p.transitions.includes(event) && WORKFLOW[event]);
  const positive = events.filter((e) => WORKFLOW[e]?.positive);
  const negative = events.filter((e) => !WORKFLOW[e]?.positive);
  const linkBlocked =
    staff && !p.canCluster && incident.duplicateCount > 0 && !incident.cluster.isDuplicate;

  const workflowTile = (event: TransitionEvent): Tile => ({
    key: event,
    label: WORKFLOW[event]?.label ?? event,
    onPress: () => onOpen({ kind: "workflow", event }),
    testID: `action-${event}`,
  });

  const main: Tile[] = [
    ...positive.map(workflowTile),
    ...(p.canAssignAction
      ? [
          {
            key: "assign",
            label: "Assign action",
            onPress: () => onOpen({ kind: "assign" }),
            testID: "action-assign",
          },
        ]
      : []),
  ];
  const [primary, ...extraMain] = main;
  const tiles: Tile[] = [
    ...extraMain,
    ...(p.canEdit
      ? [
          {
            key: "edit",
            label: "Edit",
            icon: "clip" as const,
            onPress: () => onOpen({ kind: "edit" }),
            testID: "action-edit",
          },
        ]
      : []),
    ...(p.canCluster
      ? [
          {
            key: "link",
            label: incident.cluster.isDuplicate ? "Change parent" : "Link duplicate",
            icon: "link" as const,
            onPress: () => onOpen({ kind: "link" }),
            testID: "action-link",
          },
        ]
      : []),
    ...(canUnlinkDuplicate(user?.role) && incident.cluster.isDuplicate
      ? [
          {
            key: "unlink",
            label: "Unlink duplicate",
            onPress: () => onOpen({ kind: "unlink" }),
            testID: "action-unlink",
          },
        ]
      : []),
    ...negative.map(workflowTile),
  ];

  return (
    <View style={styles.wrap} testID="action-bar">
      <Row gap={2} align="center">
        <Text variant="label" tone="muted" style={styles.flex}>
          {primary || tiles.length > 0 ? "Actions" : "No actions available"}
        </Text>
        <IconButton
          icon="refresh"
          label="Refresh"
          onPress={onRefresh}
          disabled={refreshing}
          testID="action-refresh"
        />
      </Row>
      {primary ? (
        <Button
          label={primary.label}
          onPress={primary.onPress}
          variant="primary"
          size="desk"
          fullWidth
          disabled={busy}
          testID={primary.testID}
        />
      ) : null}
      {tiles.length > 0 ? (
        <View style={styles.grid}>
          {tiles.map((tile) => (
            <View key={tile.key} style={styles.cell}>
              <Button
                label={tile.label}
                onPress={tile.onPress}
                variant="secondary"
                size="desk"
                icon={tile.icon}
                fullWidth
                disabled={busy}
                testID={tile.testID}
              />
            </View>
          ))}
        </View>
      ) : null}
      {linkBlocked ? (
        <Text variant="caption" tone="muted" testID="link-reason">
          This report has its own duplicates. Unlink them before linking it under another report.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  flex: { flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  // Two columns; an odd last tile stretches across the row.
  cell: { flexGrow: 1, flexBasis: "45%" },
});
