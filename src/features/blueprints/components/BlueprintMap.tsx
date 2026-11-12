import { StyleSheet } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Pattern,
  Polygon,
  Polyline,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { polygonCentroid, type Point } from "@/lib/geometry";
import { heatRamp, palette } from "@/lib/theme";
import { BlueprintCanvas, type CanvasBlueprint } from "./BlueprintCanvas";

export interface MapArea {
  id: string;
  name: string;
  polygon: readonly Point[];
  highlighted?: boolean | undefined;
}

export interface MapPin {
  id: string;
  x: number;
  y: number;
  /** MANUAL = solid dot; GPS_ESTIMATE = ring (guide §4.4: the marker differs by source). */
  source?: "GPS_ESTIMATE" | "MANUAL" | "NONE" | undefined;
  /** An unsaved pin the person is still placing. */
  draft?: boolean | undefined;
}

export interface HeatCell {
  x: number;
  y: number;
  centerX: number;
  centerY: number;
  count: number;
  intensity: number;
}

export interface BlueprintMapProps {
  blueprint: CanvasBlueprint;
  accessibilityLabel: string;
  areas?: readonly MapArea[] | undefined;
  pins?: readonly MapPin[] | undefined;
  /** Open polygon being drawn (draw mode). */
  draftPolygon?: readonly Point[] | undefined;
  cells?: readonly HeatCell[] | undefined;
  cellSize?: number | undefined;
  /** pick / drag / draw: a tap reports a clamped point. */
  onPick?: ((point: { x: number; y: number }) => void) | undefined;
  onImageError?: (() => void) | undefined;
}

const HATCH_FROM_BIN = 4;
const binFor = (intensity: number): number =>
  Math.min(heatRamp.length - 1, Math.floor(Math.min(Math.max(intensity, 0), 1) * heatRamp.length));

const toPoints = (polygon: readonly Point[]) => polygon.map(([x, y]) => `${x},${y}`).join(" ");

/**
 * One map for every mode (guide §6): view, pick/drag a pin, draw an area, or show heat cells.
 * Everything is drawn in blueprint pixels inside a single viewBox so it scales with the plan.
 */
export function BlueprintMap({
  blueprint,
  accessibilityLabel,
  areas = [],
  pins = [],
  draftPolygon,
  cells,
  cellSize = 50,
  onPick,
  onImageError,
}: BlueprintMapProps) {
  const stroke = Math.max(2, blueprint.widthPx / 400);
  const fontSize = Math.max(12, blueprint.widthPx / 45);
  const radius = Math.max(9, blueprint.widthPx / 60);

  return (
    <BlueprintCanvas
      blueprint={blueprint}
      accessibilityLabel={accessibilityLabel}
      {...(onPick ? { onPressPoint: onPick } : {})}
      {...(onImageError ? { onImageError } : {})}
    >
      {() => (
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${blueprint.widthPx} ${blueprint.heightPx}`}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
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
          {cells?.map((cell) => {
            const bin = binFor(cell.intensity);
            return (
              <G key={`${cell.x}-${cell.y}`}>
                <Rect
                  x={cell.x}
                  y={cell.y}
                  width={cellSize}
                  height={cellSize}
                  fill={heatRamp[bin] ?? heatRamp[0]}
                  fillOpacity={0.92}
                />
                {bin >= HATCH_FROM_BIN ? (
                  <Rect
                    x={cell.x}
                    y={cell.y}
                    width={cellSize}
                    height={cellSize}
                    fill="url(#hatch)"
                  />
                ) : null}
                <SvgText
                  x={cell.centerX}
                  y={cell.centerY + cellSize * 0.14}
                  fontSize={cellSize * 0.42}
                  fontWeight="700"
                  textAnchor="middle"
                  fill={bin < 3 ? palette.ink : palette.surface}
                >
                  {cell.count}
                </SvgText>
              </G>
            );
          })}
          {areas.map((area) => {
            const [cx, cy] = polygonCentroid(area.polygon);
            return (
              <G key={area.id}>
                <Polygon
                  points={toPoints(area.polygon)}
                  fill={area.highlighted ? palette.ink : "none"}
                  fillOpacity={area.highlighted ? 0.18 : 0}
                  stroke={palette.ink}
                  strokeWidth={area.highlighted ? stroke * 2 : stroke}
                  {...(area.highlighted ? {} : { strokeDasharray: `${stroke * 4},${stroke * 2}` })}
                />
                <SvgText
                  x={cx}
                  y={cy}
                  fontSize={fontSize}
                  fontWeight="700"
                  textAnchor="middle"
                  fill={palette.ink}
                  stroke={palette.surface}
                  strokeWidth={fontSize / 5}
                >
                  {area.name}
                </SvgText>
              </G>
            );
          })}
          {draftPolygon && draftPolygon.length > 0 ? (
            <G>
              <Polyline
                points={toPoints(draftPolygon)}
                fill="none"
                stroke={palette.focus}
                strokeWidth={stroke * 1.5}
              />
              {draftPolygon.map(([x, y], index) => (
                <Circle key={index} cx={x} cy={y} r={radius / 2} fill={palette.focus} />
              ))}
            </G>
          ) : null}
          {pins.map((pin) => (
            <G key={pin.id}>
              {pin.draft ? (
                <Rect
                  x={pin.x - radius}
                  y={pin.y - radius}
                  width={radius * 2}
                  height={radius * 2}
                  fill={palette.focus}
                  stroke={palette.surface}
                  strokeWidth={stroke}
                />
              ) : pin.source === "GPS_ESTIMATE" ? (
                <>
                  <Circle
                    cx={pin.x}
                    cy={pin.y}
                    r={radius}
                    fill={palette.surface}
                    stroke={palette.ink}
                    strokeWidth={stroke * 1.5}
                  />
                  <Circle cx={pin.x} cy={pin.y} r={radius / 4} fill={palette.ink} />
                </>
              ) : (
                <Circle
                  cx={pin.x}
                  cy={pin.y}
                  r={radius}
                  fill={palette.ink}
                  stroke={palette.surface}
                  strokeWidth={stroke * 1.5}
                />
              )}
            </G>
          ))}
        </Svg>
      )}
    </BlueprintCanvas>
  );
}
