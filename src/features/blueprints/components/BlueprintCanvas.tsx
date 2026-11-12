import { useState, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { palette, radii } from "@/lib/theme";

export interface CanvasBlueprint {
  imageUrl: string | null;
  widthPx: number;
  heightPx: number;
}

export interface BlueprintCanvasProps {
  blueprint: CanvasBlueprint;
  accessibilityLabel: string;
  /** Tap position in blueprint pixels. Omit for a read-only canvas. */
  onPressPoint?: (point: { x: number; y: number }) => void;
  /** Overlay drawn in blueprint pixels: multiply by `scale` to place it. */
  children?: (scale: number) => ReactNode;
}

/** A floor plan scaled to its container, with an overlay in blueprint coordinates. */
export function BlueprintCanvas({
  blueprint,
  accessibilityLabel,
  onPressPoint,
  children,
}: BlueprintCanvasProps) {
  const [width, setWidth] = useState(0);
  const scale = blueprint.widthPx > 0 ? width / blueprint.widthPx : 0;
  const height = scale * blueprint.heightPx;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout} style={styles.wrap}>
      {width > 0 ? (
        <View style={[styles.canvas, { height }]} accessibilityLabel={accessibilityLabel}>
          {blueprint.imageUrl ? (
            <Image
              source={{ uri: blueprint.imageUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
            />
          ) : null}
          {children?.(scale)}
          {onPressPoint ? (
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityRole="button"
              accessibilityLabel={`${accessibilityLabel}. Tap to place the pin.`}
              onPress={(event) =>
                onPressPoint({
                  x: Math.round(event.nativeEvent.locationX / scale),
                  y: Math.round(event.nativeEvent.locationY / scale),
                })
              }
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function PinMarker({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <View
      pointerEvents="none"
      style={[styles.pin, { left: x * scale - 11, top: y * scale - 11 }]}
    />
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
  pin: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.ink,
    borderWidth: 4,
    borderColor: palette.surface,
  },
});
