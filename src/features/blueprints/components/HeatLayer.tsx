import { useMemo } from "react";
import { Circle, G, Path, Text as SvgText } from "react-native-svg";
import { fonts, heatColor, heatOpacity, palette } from "@/lib/theme";
import { buildHeatField, groupByBand, type HeatInputCell, type HeatMetric } from "../lib/heat";

const BANDS = 14;

export interface HeatLayerProps {
  cells: readonly HeatInputCell[];
  cellSize: number;
  widthPx: number;
  heightPx: number;
  metric: HeatMetric;
  /** Print the report count at each cell centre (off by default: the colour is the message). */
  showCounts: boolean;
}

/**
 * The smooth heat overlay, drawn in blueprint pixels under the area outlines. Each colour band is
 * one path of tiny squares, so a dense map is a dozen SVG elements.
 */
export function HeatLayer({
  cells,
  cellSize,
  widthPx,
  heightPx,
  metric,
  showCounts,
}: HeatLayerProps) {
  const field = useMemo(
    () => buildHeatField({ cells, cellSize, widthPx, heightPx, metric }),
    [cells, cellSize, widthPx, heightPx, metric],
  );
  const bands = useMemo(() => groupByBand(field.nodes, BANDS), [field.nodes]);
  const size = field.step + 0.5; // a hair of overlap hides seams between neighbouring squares

  return (
    <G testID="heat-layer">
      {[...bands.entries()]
        .sort(([a], [b]) => a - b)
        .map(([band, nodes]) => {
          const level = (band + 0.5) / BANDS;
          return (
            <Path
              key={band}
              d={nodes.map((n) => `M${n.x} ${n.y}h${size}v${size}h${-size}z`).join("")}
              fill={heatColor(level)}
              fillOpacity={heatOpacity(level)}
            />
          );
        })}
      {showCounts
        ? cells
            .filter((cell) => cell.count > 0)
            .map((cell) => (
              <G key={`${cell.centerX}-${cell.centerY}`}>
                <Circle
                  cx={cell.centerX}
                  cy={cell.centerY}
                  r={Math.max(cellSize * 0.22, widthPx / 90)}
                  fill={palette.surface}
                  fillOpacity={0.92}
                />
                <SvgText
                  x={cell.centerX}
                  y={cell.centerY + Math.max(cellSize * 0.22, widthPx / 90) * 0.38}
                  fontSize={Math.max(cellSize * 0.3, widthPx / 70)}
                  fontFamily={fonts.semibold}
                  textAnchor="middle"
                  fill={palette.ink}
                >
                  {cell.count}
                </SvgText>
              </G>
            ))
        : null}
    </G>
  );
}
