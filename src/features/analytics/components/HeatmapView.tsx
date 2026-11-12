import { StyleSheet, View } from "react-native";
import Svg, { Defs, G, Line, Pattern, Rect, Text as SvgText } from "react-native-svg";
import type { AnalyticsFilters } from "@/lib/api";
import { formatCount } from "@/lib/format";
import { heatRamp, palette, space } from "@/lib/theme";
import { Card, Row, Stack, Text } from "@/components/ui";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/feedback";
import { BlueprintCanvas, useBlueprint } from "@/features/blueprints";
import { useHeatmap } from "../hooks/useAnalytics";

const HATCH_FROM_BIN = 4;

function binFor(intensity: number): number {
  const clamped = Math.min(Math.max(intensity, 0), 1);
  return Math.min(heatRamp.length - 1, Math.floor(clamped * heatRamp.length));
}

function Legend() {
  return (
    <Row gap={1} wrap>
      <Text variant="caption" tone="muted">
        Fewer
      </Text>
      {heatRamp.map((color, index) => (
        <View key={color} style={[styles.swatch, { backgroundColor: color }]}>
          {index >= HATCH_FROM_BIN ? <View style={styles.swatchHatch} /> : null}
        </View>
      ))}
      <Text variant="caption" tone="muted">
        More incidents
      </Text>
    </Row>
  );
}

export interface HeatmapViewProps {
  blueprintId: string;
  filters: AnalyticsFilters;
}

/**
 * Incident density on the floor plan. Greyscale ramp (colour-blind safe), the count printed in
 * every cell, hatching on the densest cells, and an area ranking as a text alternative.
 */
export function HeatmapView({ blueprintId, filters }: HeatmapViewProps) {
  const blueprint = useBlueprint(blueprintId);
  const heatmap = useHeatmap(filters, blueprintId);

  if (blueprint.isPending || heatmap.isPending) return <ListSkeleton rows={2} />;
  if (blueprint.isError)
    return <ErrorState error={blueprint.error} onRetry={() => void blueprint.refetch()} />;
  if (heatmap.isError)
    return <ErrorState error={heatmap.error} onRetry={() => void heatmap.refetch()} />;
  const plan = blueprint.data;
  const data = heatmap.data;
  if (!plan || !data) return null;
  if (data.cells.length === 0) {
    return (
      <EmptyState
        icon="map"
        title="No incidents in this view"
        message="Try a longer date range or fewer filters."
      />
    );
  }

  const summary = `${formatCount(data.totals.reports)} reports across ${data.cells.length} grid cells.`;
  const ranked = [...data.areas].sort((a, b) => b.count - a.count);

  return (
    <Stack gap={4}>
      <BlueprintCanvas
        blueprint={plan}
        accessibilityLabel={`Incident heatmap of ${plan.name}. ${summary}`}
      >
        {() => (
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${plan.widthPx} ${plan.heightPx}`}
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <Pattern
                id="hatch"
                patternUnits="userSpaceOnUse"
                width={14}
                height={14}
                patternTransform="rotate(45)"
              >
                <Line
                  x1={0}
                  y1={0}
                  x2={0}
                  y2={14}
                  stroke={palette.surface}
                  strokeWidth={3}
                  strokeOpacity={0.35}
                />
              </Pattern>
            </Defs>
            {data.cells.map((cell) => {
              const bin = binFor(cell.intensity);
              const light = bin < 3;
              return (
                <G key={`${cell.x}-${cell.y}`}>
                  <Rect
                    x={cell.x}
                    y={cell.y}
                    width={data.cellSize}
                    height={data.cellSize}
                    fill={heatRamp[bin] ?? heatRamp[0]}
                    fillOpacity={0.92}
                  />
                  {bin >= HATCH_FROM_BIN ? (
                    <Rect
                      x={cell.x}
                      y={cell.y}
                      width={data.cellSize}
                      height={data.cellSize}
                      fill="url(#hatch)"
                    />
                  ) : null}
                  <SvgText
                    x={cell.centerX}
                    y={cell.centerY + data.cellSize * 0.14}
                    fontSize={data.cellSize * 0.42}
                    fontWeight="700"
                    textAnchor="middle"
                    fill={light ? palette.ink : palette.surface}
                  >
                    {cell.count}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        )}
      </BlueprintCanvas>
      <Legend />
      <Card>
        <Stack gap={2}>
          <Text variant="label" accessibilityRole="header">
            Areas ranked by reports
          </Text>
          <Text variant="caption" tone="muted">
            {summary}
          </Text>
          {ranked.map((area, index) => (
            <View
              key={area.areaId}
              style={styles.areaRow}
              accessible
              accessibilityLabel={`${area.name}: ${area.count} reports`}
            >
              <Text variant="mono" tone="muted" style={styles.rank}>
                {index + 1}
              </Text>
              <Text style={styles.flex}>{area.name}</Text>
              <Text variant="mono">{formatCount(area.count)}</Text>
            </View>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}

const styles = StyleSheet.create({
  swatch: { width: 28, height: 16, borderRadius: 2, overflow: "hidden" },
  swatchHatch: {
    ...StyleSheet.absoluteFill,
    backgroundColor: palette.surface,
    opacity: 0.22,
  },
  areaRow: { flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[1] },
  rank: { width: 24 },
  flex: { flex: 1 },
});
