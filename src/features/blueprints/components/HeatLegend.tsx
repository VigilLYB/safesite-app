import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { heatColor, space } from "@/lib/theme";
import { Row, Text } from "@/components/ui";

const STOPS = 8;

/** The real colour scale: pale where there are few reports, dark where they pile up. */
export function HeatLegend({ lowLabel, highLabel }: { lowLabel: string; highLabel: string }) {
  return (
    <View
      style={styles.box}
      accessible
      accessibilityLabel={`Colour scale, from ${lowLabel} to ${highLabel}`}
      testID="heat-legend"
    >
      <Svg width="100%" height={14}>
        <Defs>
          <LinearGradient id="heat-scale" x1="0" y1="0" x2="1" y2="0">
            {Array.from({ length: STOPS }, (_, i) => (
              <Stop
                key={i}
                offset={`${(i / (STOPS - 1)) * 100}%`}
                stopColor={heatColor(i / (STOPS - 1))}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={14} rx={4} fill="url(#heat-scale)" />
      </Svg>
      <Row justify="space-between">
        <Text variant="caption" tone="muted">
          {lowLabel}
        </Text>
        <Text variant="caption" tone="muted">
          {highLabel}
        </Text>
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({ box: { gap: space[1] } });
