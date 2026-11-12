import { useState, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { clampPoint } from "@/lib/geometry";
import { palette, radii } from "@/lib/theme";
import { Text } from "@/components/ui";

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

/** A floor plan scaled to its container, with an overlay in blueprint coordinates. */
export function BlueprintCanvas({
  blueprint,
  accessibilityLabel,
  onPressPoint,
  onImageError,
  children,
}: BlueprintCanvasProps) {
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState(false);
  const scale = blueprint.widthPx > 0 ? width / blueprint.widthPx : 0;
  const height = scale * blueprint.heightPx;
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout} style={styles.wrap} testID="blueprint-canvas">
      {width > 0 ? (
        <View style={[styles.canvas, { height }]} accessibilityLabel={accessibilityLabel}>
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
          {children?.(scale)}
          {onPressPoint ? (
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityRole="button"
              accessibilityLabel={`${accessibilityLabel}. Tap to place the pin.`}
              testID="map-pick"
              onPress={(event) => {
                const [x, y] = clampPoint(
                  event.nativeEvent.locationX / scale,
                  event.nativeEvent.locationY / scale,
                  blueprint.widthPx,
                  blueprint.heightPx,
                );
                onPressPoint({ x, y });
              }}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  canvas: {
    width: "100%",
    backgroundColor: palette.grey200,
    borderRadius: radii.card,
    overflow: "hidden",
  },
  unavailable: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
});
