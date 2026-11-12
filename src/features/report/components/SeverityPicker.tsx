import { useState } from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { Easing, useAnimatedStyle, withTiming } from "react-native-reanimated";
import type { Severity } from "@/lib/api";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { motion, palette, severityTokens, space } from "@/lib/theme";
import { Text } from "@/components/ui";
import { SEVERITIES, SeverityBadge, severityHint, severityLabel } from "@/components/domain";

const THUMB = 26;
const NODE = 12;

/**
 * "How serious is it?" as a four-stop slider: drag the thumb or tap a stop. The thumb snaps to the
 * nearest stop, the filled track takes the severity colour, and the chosen level is spelled out
 * below with its plain-language hint. Each stop is also a radio for screen readers. Default Medium.
 */
export function SeverityPicker({
  value,
  onChange,
}: {
  value: Severity;
  onChange: (value: Severity) => void;
}) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [dragX, setDragX] = useState<number | null>(null);
  const index = SEVERITIES.indexOf(value);
  const step = width > 0 ? width / (SEVERITIES.length - 1) : 0;
  const stopX = (i: number) => i * step;
  const nearest = (x: number) =>
    step > 0 ? Math.min(SEVERITIES.length - 1, Math.max(0, Math.round(x / step))) : index;

  const pan = usePanGesture({
    runOnJS: true,
    onBegin: (event) => {
      setDragX(Math.min(width, Math.max(0, event.x)));
    },
    onUpdate: (event) => {
      const x = Math.min(width, Math.max(0, event.x));
      setDragX(x);
      const next = SEVERITIES[nearest(x)];
      if (next && next !== value) onChange(next);
    },
    onFinalize: () => setDragX(null),
  });

  const x = dragX ?? stopX(index);
  const timing = {
    duration: reduced || dragX !== null ? 0 : motion.state,
    easing: Easing.out(Easing.cubic),
  };
  const thumbStyle = useAnimatedStyle(
    () => ({ transform: [{ translateX: withTiming(x - THUMB / 2, timing) }] }),
    [x, timing.duration],
  );
  const fillStyle = useAnimatedStyle(
    () => ({ width: withTiming(x, timing) }),
    [x, timing.duration],
  );
  const tokens = severityTokens[value];

  return (
    <View
      style={styles.group}
      accessibilityRole="radiogroup"
      accessibilityLabel="How serious is it?"
    >
      <GestureDetector gesture={pan}>
        <View
          style={styles.trackArea}
          onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width - THUMB)}
        >
          <View style={styles.trackInner}>
            <View style={styles.track} />
            <Animated.View style={[styles.fill, { backgroundColor: tokens.fill }, fillStyle]} />
            {SEVERITIES.map((severity, i) => (
              <Pressable
                key={severity}
                accessibilityRole="radio"
                accessibilityState={{ checked: severity === value }}
                accessibilityLabel={`${severityLabel[severity]}. ${severityHint[severity]}`}
                onPress={() => onChange(severity)}
                hitSlop={14}
                testID={`severity-${severity}`}
                style={[
                  styles.node,
                  { left: stopX(i) - NODE / 2 },
                  i <= index ? { backgroundColor: tokens.fill, borderColor: tokens.fill } : null,
                ]}
              />
            ))}
            <Animated.View
              pointerEvents="none"
              style={[styles.thumb, { borderColor: tokens.fill }, thumbStyle]}
            />
          </View>
        </View>
      </GestureDetector>
      <View style={styles.labels} importantForAccessibility="no-hide-descendants">
        {SEVERITIES.map((severity) => (
          <Text
            key={severity}
            variant="caption"
            tone={severity === value ? "default" : "muted"}
            style={styles.stopLabel}
          >
            {severityLabel[severity]}
          </Text>
        ))}
      </View>
      <View style={styles.summary}>
        <SeverityBadge severity={value} />
        <View style={styles.summaryText}>
          <Text variant="label">{severityLabel[value]}</Text>
          <Text variant="caption" tone="muted">
            {severityHint[value]}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[2] },
  trackArea: { height: 44, justifyContent: "center", paddingHorizontal: THUMB / 2 },
  trackInner: { height: THUMB, justifyContent: "center" },
  track: { height: 4, borderRadius: 2, backgroundColor: palette.grey200 },
  fill: { position: "absolute", left: 0, height: 4, borderRadius: 2 },
  node: {
    position: "absolute",
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.grey400,
  },
  thumb: {
    position: "absolute",
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: palette.surface,
    borderWidth: 3,
  },
  labels: { flexDirection: "row", justifyContent: "space-between" },
  stopLabel: { width: 64, textAlign: "center" },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[3],
    borderRadius: 6,
    backgroundColor: palette.grey50,
  },
  summaryText: { flex: 1, gap: 2 },
});
