import { useEffect, useRef, type ComponentRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { TimelineNode } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/format";
import { actorRoleLabel } from "@/lib/labels";
import { fonts, palette, space } from "@/lib/theme";
import { Text } from "@/components/ui";

export interface TimelineBarProps {
  nodes: readonly TimelineNode[];
  currentVersion: number;
  onSelect: (version: number) => void;
  /** Highlight the node being viewed on the past-version page. */
  selectedVersion?: number | undefined;
}

const COLUMN = 92;
const DOT = 12;

/** First name only, so a node stays one short line ("Ravi", "AI"). */
const shortActor = (node: TimelineNode) =>
  node.actor.role === "SYSTEM" ? actorRoleLabel.SYSTEM : (node.actor.fullName.split(" ")[0] ?? "");

/**
 * Guide §3C as a git-style line: one dot per version, oldest left, latest in view on load.
 * Each node shows only when and who (above) and the version (below); the full label, note and
 * changes appear when that version is opened. AI-made versions are hollow dots.
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
  const active = selectedVersion ?? currentVersion;

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      accessibilityLabel="Version timeline"
      testID="timeline-bar"
    >
      <View style={[styles.line, { width: Math.max(0, (nodes.length - 1) * COLUMN) }]} />
      {nodes.map((node) => {
        const isActive = node.version === active;
        const system = node.actor.role === "SYSTEM";
        return (
          <Pressable
            key={node.versionId}
            accessibilityRole="button"
            accessibilityLabel={`Version ${node.version}: ${node.label}, ${node.actor.fullName}, ${formatDate(node.createdAt)} ${formatTime(node.createdAt)}${node.version === currentVersion ? ", current" : ""}`}
            accessibilityState={{ selected: isActive }}
            onPress={() => onSelect(node.version)}
            testID={`timeline-node-${node.version}`}
            style={({ pressed }) => [styles.column, pressed && styles.pressed]}
          >
            <Text variant="caption" tone="muted" numberOfLines={1} style={styles.meta}>
              {formatDate(node.createdAt)}
            </Text>
            <Text
              variant="caption"
              numberOfLines={1}
              style={[styles.meta, isActive ? styles.metaOn : styles.metaOff]}
            >
              {shortActor(node)} · {formatTime(node.createdAt)}
            </Text>
            <View style={styles.dotRow}>
              <View
                style={[
                  styles.dot,
                  system ? styles.dotSystem : styles.dotPerson,
                  isActive && styles.dotActive,
                ]}
              />
            </View>
            <Text variant="mono" style={isActive ? styles.metaOn : styles.metaOff}>
              v{node.version}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Height of the two caption lines above the dots: the connecting line sits at dot centre. */
const META_HEIGHT = 16 * 2 + 4;

const styles = StyleSheet.create({
  content: { paddingVertical: space[1], paddingHorizontal: space[1] },
  line: {
    position: "absolute",
    left: space[1] + COLUMN / 2,
    top: space[1] + META_HEIGHT + 2 + 12 - 1,
    height: 2,
    backgroundColor: palette.grey300,
  },
  column: { width: COLUMN, alignItems: "center", gap: 2, paddingVertical: 2, borderRadius: 6 },
  pressed: { backgroundColor: palette.grey50 },
  meta: { maxWidth: COLUMN - 8, textAlign: "center" },
  metaOn: { color: palette.ink, fontFamily: fonts.semibold },
  metaOff: { color: palette.grey500 },
  dotRow: { height: 24, alignItems: "center", justifyContent: "center" },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2 },
  dotPerson: { backgroundColor: palette.grey500, borderColor: palette.grey500 },
  dotSystem: { backgroundColor: palette.surface, borderColor: palette.grey500 },
  dotActive: {
    width: DOT + 6,
    height: DOT + 6,
    borderRadius: (DOT + 6) / 2,
    backgroundColor: palette.ink,
    borderColor: palette.surface,
    borderWidth: 3,
  },
});
