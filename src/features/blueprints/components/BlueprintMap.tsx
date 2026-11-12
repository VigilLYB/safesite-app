import { StyleSheet } from "react-native";
import Svg, { Circle, G, Polygon, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { polygonCentroid, type Point } from "@/lib/geometry";
import { fonts, heatRamp, palette } from "@/lib/theme";
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
  /**
   * Draw area names on the map. Default: only when the plan has no image (a drawn floor plan
   * already carries its own room names) or the area is highlighted.
   */
  showAreaLabels?: boolean | undefined;
}

/** Ramp bins from this one up are dark enough to need light count text. */
const LIGHT_TEXT_FROM_BIN = 3;
const binFor = (intensity: number): number =>
  Math.min(heatRamp.length - 1, Math.floor(Math.min(Math.max(intensity, 0), 1) * heatRamp.length));

const toPoints = (polygon: readonly Point[]) => polygon.map(([x, y]) => `${x},${y}`).join(" ");

/**
 * A name on a solid pill: dark text on white with a hairline edge, readable over any plan or heat
 * colour (a stroked "halo" renders as white blur on Android).
 */
function AreaLabel({ x, y, name, size }: { x: number; y: number; name: string; size: number }) {
  const padX = size * 0.5;
  const width = name.length * size * 0.56 + padX * 2;
  const height = size * 1.6;
  return (
    <G>
      <Rect
        x={x - width / 2}
        y={y - height / 2}
        width={width}
        height={height}
        rx={height / 4}
        fill={palette.surface}
        fillOpacity={0.94}
        stroke={palette.grey300}
        strokeWidth={size / 12}
      />
      <SvgText
        x={x}
        y={y + size * 0.36}
        fontSize={size}
        fontFamily={fonts.semibold}
        textAnchor="middle"
        fill={palette.ink}
      >
        {name}
      </SvgText>
    </G>
  );
}

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
  showAreaLabels,
}: BlueprintMapProps) {
  const stroke = Math.max(2, blueprint.widthPx / 500);
  const fontSize = Math.max(12, blueprint.widthPx / 70);
  const radius = Math.max(9, blueprint.widthPx / 70);
  const labelAreas = showAreaLabels ?? !blueprint.imageUrl;

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
          {cells?.map((cell) => {
            const bin = binFor(cell.intensity);
            return (
              <G key={`${cell.x}-${cell.y}`}>
                <Rect
                  x={cell.x}
                  y={cell.y}
                  width={cellSize}
                  height={cellSize}
                  rx={cellSize * 0.08}
                  fill={heatRamp[bin] ?? heatRamp[0]}
                  fillOpacity={0.85}
                />
                <SvgText
                  x={cell.centerX}
                  y={cell.centerY + cellSize * 0.13}
                  fontSize={cellSize * 0.36}
                  fontFamily={fonts.semibold}
                  textAnchor="middle"
                  fill={bin < LIGHT_TEXT_FROM_BIN ? palette.ink : palette.surface}
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
                  fillOpacity={area.highlighted ? 0.12 : 0}
                  stroke={area.highlighted ? palette.ink : palette.grey500}
                  strokeWidth={area.highlighted ? stroke * 2 : stroke}
                  {...(area.highlighted ? {} : { strokeDasharray: `${stroke * 4},${stroke * 3}` })}
                />
                {labelAreas || area.highlighted ? (
                  <AreaLabel x={cx} y={cy} name={area.name} size={fontSize} />
                ) : null}
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
