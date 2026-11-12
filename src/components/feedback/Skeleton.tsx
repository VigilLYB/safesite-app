import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { palette, radii, space } from "@/lib/theme";

function Block({ height, width = "100%" }: { height: number; width?: number | `${number}%` }) {
  const [opacity] = useState(() => new Animated.Value(1));
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduced]);

  return <Animated.View style={[styles.block, { height, width, opacity }]} />;
}

/** Placeholder matching the real layout of a list row, so nothing jumps when data arrives. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.list} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.row}>
          <Block height={14} width="40%" />
          <Block height={20} width="85%" />
          <Block height={28} width="30%" />
        </View>
      ))}
    </View>
  );
}

/** Header, two badges, meta line and a body block: matches the incident / action detail layout. */
export function DetailSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <View style={styles.list} accessibilityLabel="Loading" accessibilityRole="progressbar">
      <View style={styles.row}>
        <Block height={26} width="70%" />
        <Block height={24} width="35%" />
        <Block height={14} width="55%" />
      </View>
      <View style={styles.row}>
        {Array.from({ length: lines }, (_, index) => (
          <Block key={index} height={16} width={index === lines - 1 ? "60%" : "100%"} />
        ))}
      </View>
    </View>
  );
}

export function TileSkeleton({ tiles = 7 }: { tiles?: number }) {
  return (
    <View style={styles.tiles} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: tiles }, (_, index) => (
        <View key={index} style={[styles.row, styles.tile]}>
          <Block height={12} width="60%" />
          <Block height={30} width="40%" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: space[3] },
  tile: { flexGrow: 1, flexBasis: 150 },
  list: { gap: space[3] },
  row: {
    backgroundColor: palette.surface,
    borderRadius: radii.card,
    padding: space[4],
    gap: space[2],
  },
  block: { backgroundColor: palette.grey200, borderRadius: radii.control },
});
