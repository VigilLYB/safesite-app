import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Busy indicator for buttons: three dots that pulse in turn. Used instead of a spinner, so a
 * pressed button keeps its label and only gains a quiet "working" cue.
 */
export function LoadingDots({ color }: { color: string }) {
  const reduced = useReducedMotion();
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0.3)));
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.stagger(
        160,
        dots.map((dot) =>
          Animated.sequence([
            Animated.timing(dot, { toValue: 1, duration: 260, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0.3, duration: 260, useNativeDriver: true }),
          ]),
        ),
      ),
    );
    loop.start();
    return () => loop.stop();
  }, [dots, reduced]);
  return (
    <View style={styles.dots} importantForAccessibility="no-hide-descendants">
      {dots.map((opacity, index) => (
        <Animated.View
          key={index}
          style={[styles.dot, { backgroundColor: color, opacity: reduced ? 0.7 : opacity }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: "row", gap: 4, alignItems: "center", height: 16 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
