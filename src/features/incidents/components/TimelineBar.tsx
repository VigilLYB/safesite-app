import { useEffect, useRef, type ComponentRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { TimelineNode } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { actorRoleLabel } from "@/lib/labels";
import { palette, radii, space } from "@/lib/theme";
import { Icon, Text } from "@/components/ui";

export interface TimelineBarProps {
  nodes: readonly TimelineNode[];
  currentVersion: number;
  onSelect: (version: number) => void;
  /** Highlight the node being viewed on the past-version page. */
  selectedVersion?: number | undefined;
}

/**
 * Guide §3C: one node per version, in order, latest in view on load. Labels come from the API
 * ("Worker Submitted", "AI Transcribed Audio") and are never built here.
 */
export function TimelineBar({
  nodes,
  currentVersion,
  onSelect,
  selectedVersion,
}: TimelineBarProps) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    const timer = setTimeout(() => scroll.current?.scrollToEnd({ animated: false }), 0);
    return () => clearTimeout(timer);
  }, [nodes.length]);

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel="Version timeline"
      testID="timeline-bar"
    >
      {nodes.map((node) => {
        const current = node.version === currentVersion;
        const selected = node.version === selectedVersion;
        const actor = node.actor.role === "SYSTEM" ? actorRoleLabel.SYSTEM : node.actor.fullName;
        return (
          <Pressable
            key={node.versionId}
            accessibilityRole="button"
            accessibilityLabel={`${node.label}, version ${node.version}${current ? ", current" : ""}`}
            accessibilityState={{
              selected: selected || (selectedVersion === undefined && current),
            }}
            onPress={() => onSelect(node.version)}
            style={[
              styles.node,
              (selected || (selectedVersion === undefined && current)) && styles.nodeOn,
            ]}
            testID={`timeline-node-${node.version}`}
          >
            <View style={styles.top}>
              {current ? <Icon name="check" size={14} /> : null}
              <Text variant="mono" tone="muted">
                v{node.version}
              </Text>
            </View>
            <Text variant="label">{node.label}</Text>
            <Text variant="caption" tone="muted">
              {actor}
            </Text>
            <Text variant="caption" tone="muted">
              {formatDateTime(node.createdAt)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space[2], paddingVertical: space[1] },
  node: {
    width: 168,
    gap: 2,
    padding: space[3],
    borderRadius: radii.card,
    backgroundColor: palette.surface,
  },
  nodeOn: {
    backgroundColor: palette.grey100,
    borderBottomWidth: 3,
    borderBottomColor: palette.ink,
  },
  top: { flexDirection: "row", gap: space[1], alignItems: "center" },
});
