import { useState, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { clampPoint } from "@/lib/geometry";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { motion, palette, radii, space } from "@/lib/theme";
import { IconButton, Text } from "@/components/ui";

export interface CanvasBlueprint {
  imageUrl: string | null;
  widthPx: number;
  heightPx: number;
}

export interface BlueprintCanvasProps {
  blueprint: CanvasBlueprint;
  accessibilityLabel: string;
  /** Tap position in blueprint pixels, clamped and rounded. Omit for a read-only canvas. */
  onPressPoint?: (point: { x: number; y: number }) => void;
  /** Called once when the image link fails, so the owner can refetch a fresh presigned URL. */
  onImageError?: () => void;
  /** Overlay drawn in blueprint pixels: multiply by `scale` to place it. */
  children?: (scale: number) => ReactNode;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const STEP_ZOOM = 1.6;

/**
 * A floor plan fitted to its container, with an overlay in blueprint coordinates. Pinch to zoom
 * (around the fingers), drag to pan once zoomed, double-tap to zoom in or back out; the buttons do
 * the same for anyone who can't pinch. Taps to place a pin are read in the plan's own coordinates,
 * so they stay exact at any zoom.
 */
export function BlueprintCanvas({
  blueprint,
  accessibilityLabel,
  onPressPoint,
  onImageError,
  children,
}: BlueprintCanvasProps) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const fit = blueprint.widthPx > 0 ? width / blueprint.widthPx : 0;
  const height = fit * blueprint.heightPx;
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const zoom = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const start = useSharedValue({ zoom: 1, tx: 0, ty: 0 });
  const zoomed = useDerivedValue(() => zoom.value > 1.01);
  const duration = reduced ? 0 : motion.sheet;

  /** Keeps the plan covering the frame: no empty margins at any zoom. */
  const clampTranslate = (value: number, size: number, z: number) => {
    "worklet";
    const max = (size * (z - 1)) / 2;
    return Math.min(max, Math.max(-max, value));
  };

  /** Zoom to `next` keeping the point (fx, fy), relative to the frame's centre, still. */
  const zoomAround = (next: number, fx: number, fy: number, animate: boolean) => {
    "worklet";
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    const ratio = z / start.value.zoom;
    const nx = clampTranslate(fx - (fx - start.value.tx) * ratio, width, z);
    const ny = clampTranslate(fy - (fy - start.value.ty) * ratio, height, z);
    const timing = { duration: animate ? duration : 0, easing: Easing.out(Easing.cubic) };
    zoom.value = withTiming(z, timing);
    tx.value = withTiming(nx, timing);
    ty.value = withTiming(ny, timing);
  };

  const pinch = usePinchGesture({
    onBegin: () => {
      "worklet";
      start.value = { zoom: zoom.value, tx: tx.value, ty: ty.value };
    },
    onUpdate: (event) => {
      "worklet";
      zoomAround(
        start.value.zoom * event.scale,
        event.focalX - width / 2,
        event.focalY - height / 2,
        false,
      );
    },
  });
  const pan = usePanGesture({
    enabled: zoomed,
    onBegin: () => {
      "worklet";
      start.value = { zoom: zoom.value, tx: tx.value, ty: ty.value };
    },
    onUpdate: (event) => {
      "worklet";
      tx.value = clampTranslate(start.value.tx + event.translationX, width, zoom.value);
      ty.value = clampTranslate(start.value.ty + event.translationY, height, zoom.value);
    },
  });
  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onDeactivate: (event) => {
      "worklet";
      start.value = { zoom: zoom.value, tx: tx.value, ty: ty.value };
      if (zoom.value > 1.01) zoomAround(1, 0, 0, true);
      else zoomAround(2.5, event.x - width / 2, event.y - height / 2, true);
    },
  });
  const gestures = useSimultaneousGestures(pinch, pan, doubleTap);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: zoom.value }],
  }));

  /** Buttons: zoom around the centre, and remember the level so "reset" knows when to show. */
  const stepZoom = (factor: number) => {
    start.value = { zoom: zoom.value, tx: tx.value, ty: ty.value };
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value * factor));
    zoomAround(next, 0, 0, true);
    setZoomLevel(next);
  };
  const reset = () => {
    start.value = { zoom: zoom.value, tx: tx.value, ty: ty.value };
    zoomAround(1, 0, 0, true);
    setZoomLevel(1);
  };

  return (
    <View onLayout={onLayout} style={styles.wrap} testID="blueprint-canvas">
      {width > 0 ? (
        <View style={[styles.frame, { height }]} accessibilityLabel={accessibilityLabel}>
          <GestureDetector gesture={gestures}>
            <Animated.View style={[StyleSheet.absoluteFill, contentStyle]}>
              {blueprint.imageUrl && !failed ? (
                <Image
                  source={{ uri: blueprint.imageUrl }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="contain"
                  onError={() => {
                    setFailed(true);
                    onImageError?.();
                  }}
                />
              ) : null}
              {blueprint.imageUrl && failed ? (
                <View style={styles.unavailable}>
                  <Text variant="caption" tone="muted">
                    Media unavailable
                  </Text>
                </View>
              ) : null}
              {children?.(fit)}
              {onPressPoint ? (
                <Pressable
                  style={StyleSheet.absoluteFill}
                  accessibilityRole="button"
                  accessibilityLabel={`${accessibilityLabel}. Tap to place the pin.`}
                  testID="map-pick"
                  onPress={(event) => {
                    // locationX/Y are in the plan's own (unzoomed) frame, so zoom never skews a pin.
                    const [x, y] = clampPoint(
                      event.nativeEvent.locationX / fit,
                      event.nativeEvent.locationY / fit,
                      blueprint.widthPx,
                      blueprint.heightPx,
                    );
                    onPressPoint({ x, y });
                  }}
                />
              ) : null}
            </Animated.View>
          </GestureDetector>
          <View style={styles.controls}>
            <IconButton
              icon="plus"
              label="Zoom in"
              onPress={() => stepZoom(STEP_ZOOM)}
              testID="map-zoom-in"
            />
            <IconButton
              icon="minus"
              label="Zoom out"
              onPress={() => stepZoom(1 / STEP_ZOOM)}
              testID="map-zoom-out"
            />
            {zoomLevel > 1 ? (
              <IconButton
                icon="refresh"
                label="Reset zoom"
                onPress={reset}
                testID="map-zoom-reset"
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  frame: {
    width: "100%",
    backgroundColor: palette.grey100,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: palette.border,
    overflow: "hidden",
  },
  unavailable: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  controls: {
    position: "absolute",
    right: space[2],
    bottom: space[2],
    flexDirection: "row",
    gap: space[1],
    padding: 2,
    borderRadius: radii.card,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: palette.border,
  },
});
