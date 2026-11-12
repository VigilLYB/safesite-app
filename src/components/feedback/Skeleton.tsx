import { useEffect, useState } from "react";
import { Animated, StyleSheet, View, type DimensionValue } from "react-native";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { palette, radii, space } from "@/lib/theme";

/** One shared, gentle pulse so every placeholder on screen breathes together. */
function usePulse(): Animated.Value {
  const [opacity] = useState(() => new Animated.Value(1));
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.45, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduced]);
  return opacity;
}

function Block({
  height,
  width = "100%",
  round = false,
  pulse,
}: {
  height: number;
  width?: DimensionValue;
  round?: boolean;
  pulse: Animated.Value;
}) {
  return (
    <Animated.View
      style={[styles.block, round && styles.round, { height, width, opacity: pulse }]}
    />
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.list} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {children}
    </View>
  );
}

/** Matches an incident / action card: meter + status, a title, a meta line. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  const pulse = usePulse();
  return (
    <Frame>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.inline}>
            <Block height={20} width={44} pulse={pulse} />
            <Block height={20} width={72} pulse={pulse} />
          </View>
          <Block height={16} width={index % 2 ? "70%" : "85%"} pulse={pulse} />
          <Block height={12} width="45%" pulse={pulse} />
        </View>
      ))}
    </Frame>
  );
}

/** Report / action detail: title, badges, a timeline line of dots, actions, then body lines. */
export function DetailSkeleton({ lines = 4 }: { lines?: number }) {
  const pulse = usePulse();
  return (
    <Frame>
      <View style={styles.bare}>
        <Block height={12} width="30%" pulse={pulse} />
        <Block height={22} width="70%" pulse={pulse} />
        <View style={styles.inline}>
          <Block height={22} width={80} pulse={pulse} />
          <Block height={22} width={44} pulse={pulse} />
        </View>
      </View>
      <TimelineSkeletonBody pulse={pulse} />
      <View style={styles.card}>
        <Block height={40} pulse={pulse} />
        <View style={styles.inline}>
          <Block height={40} width="48%" pulse={pulse} />
          <Block height={40} width="48%" pulse={pulse} />
        </View>
      </View>
      <View style={styles.card}>
        {Array.from({ length: lines }, (_, index) => (
          <Block
            key={index}
            height={14}
            width={index === lines - 1 ? "60%" : "100%"}
            pulse={pulse}
          />
        ))}
      </View>
    </Frame>
  );
}

function TimelineSkeletonBody({ pulse }: { pulse: Animated.Value }) {
  return (
    <View style={styles.timeline}>
      <View style={styles.timelineLine} />
      {Array.from({ length: 5 }, (_, index) => (
        <View key={index} style={styles.timelineNode}>
          <Block height={10} width={48} pulse={pulse} />
          <Block height={14} width={14} round pulse={pulse} />
        </View>
      ))}
    </View>
  );
}

/** The version timeline on its own (History tab, past versions). */
export function TimelineSkeleton() {
  const pulse = usePulse();
  return (
    <Frame>
      <TimelineSkeletonBody pulse={pulse} />
    </Frame>
  );
}

/** A floor plan placeholder at the plan's shape, so the page doesn't jump when it loads. */
export function MapSkeleton({ aspectRatio = 1.6 }: { aspectRatio?: number }) {
  const pulse = usePulse();
  return (
    <Frame>
      <Animated.View style={[styles.map, { aspectRatio, opacity: pulse }]} />
    </Frame>
  );
}

/** KPI tiles on the analytics overview. */
export function TileSkeleton({ tiles = 7 }: { tiles?: number }) {
  const pulse = usePulse();
  return (
    <View style={styles.tiles} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: tiles }, (_, index) => (
        <View key={index} style={[styles.card, styles.tile]}>
          <Block height={12} width="60%" pulse={pulse} />
          <Block height={28} width="40%" pulse={pulse} />
        </View>
      ))}
    </View>
  );
}

/** The signed-in frame while the session loads: header, a few cards, the tab bar. */
export function AppSkeleton() {
  const pulse = usePulse();
  return (
    <View style={styles.app} accessibilityLabel="Loading" accessibilityRole="progressbar">
      <View style={styles.bare}>
        <Block height={22} width="45%" pulse={pulse} />
        <Block height={36} width="100%" pulse={pulse} />
      </View>
      {Array.from({ length: 3 }, (_, index) => (
        <View key={index} style={styles.card}>
          <Block height={20} width={44} pulse={pulse} />
          <Block height={16} width="80%" pulse={pulse} />
          <Block height={12} width="40%" pulse={pulse} />
        </View>
      ))}
      <View style={styles.tabBar}>
        {Array.from({ length: 4 }, (_, index) => (
          <View key={index} style={styles.tabItem}>
            <Block height={20} width={20} round pulse={pulse} />
            <Block height={8} width={36} pulse={pulse} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[3] },
  app: { flex: 1, gap: space[3], padding: space[4] },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: space[3] },
  tile: { flexGrow: 1, flexBasis: 150 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: palette.border,
    padding: space[3],
    gap: space[2],
  },
  bare: { gap: space[2] },
  inline: { flexDirection: "row", gap: space[2], justifyContent: "space-between" },
  block: { backgroundColor: palette.grey200, borderRadius: radii.control },
  round: { borderRadius: 999 },
  timeline: { flexDirection: "row", justifyContent: "space-between", paddingVertical: space[1] },
  timelineLine: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 6,
    height: 2,
    backgroundColor: palette.grey200,
  },
  timelineNode: { alignItems: "center", gap: space[2] },
  map: { width: "100%", backgroundColor: palette.grey200, borderRadius: radii.card },
  tabBar: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: space[2],
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: palette.border,
  },
  tabItem: { alignItems: "center", gap: space[1] },
});
