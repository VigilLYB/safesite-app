export type HeatMetric = "count" | "score";

export interface HeatInputCell {
  centerX: number;
  centerY: number;
  count: number;
  score: number;
}

export interface HeatNode {
  x: number;
  y: number;
  /** 0..1 relative to the hottest spot on the map. */
  level: number;
}

export interface HeatField {
  /** Side of each raster square, in blueprint pixels. */
  step: number;
  nodes: HeatNode[];
}

/** Levels below this are not drawn: they would be a faint smudge far from any report. */
export const MIN_LEVEL = 0.05;
/** Perceptual boost so a single report is still visible next to a cluster of twenty. */
const GAMMA = 0.75;
const COLUMNS = 120;
const CUTOFF_SIGMAS = 3;

/**
 * Turn grid cells into a smooth density field. Every cell becomes a Gaussian blob, so reports that
 * are close together add up and the area gets hotter; isolated reports stay a faint glow.
 * Pure and deterministic: the drawing layer only has to colour the nodes.
 */
export function buildHeatField(input: {
  cells: readonly HeatInputCell[];
  cellSize: number;
  widthPx: number;
  heightPx: number;
  metric: HeatMetric;
}): HeatField {
  const { cells, cellSize, widthPx, heightPx, metric } = input;
  const step = Math.max(4, widthPx / COLUMNS);
  const cols = Math.ceil(widthPx / step);
  const rows = Math.ceil(heightPx / step);
  const sigma = Math.max(cellSize * 0.9, step * 1.5);
  const reach = Math.ceil((sigma * CUTOFF_SIGMAS) / step);
  const density = new Float32Array(cols * rows);
  const twoSigmaSq = 2 * sigma * sigma;

  for (const cell of cells) {
    const weight = metric === "score" ? cell.score : cell.count;
    if (!(weight > 0)) continue;
    const cx = Math.floor(cell.centerX / step);
    const cy = Math.floor(cell.centerY / step);
    for (let row = Math.max(0, cy - reach); row <= Math.min(rows - 1, cy + reach); row += 1) {
      for (let col = Math.max(0, cx - reach); col <= Math.min(cols - 1, cx + reach); col += 1) {
        const dx = (col + 0.5) * step - cell.centerX;
        const dy = (row + 0.5) * step - cell.centerY;
        density[row * cols + col] =
          (density[row * cols + col] ?? 0) + weight * Math.exp(-(dx * dx + dy * dy) / twoSigmaSq);
      }
    }
  }

  let max = 0;
  for (const value of density) if (value > max) max = value;
  if (max === 0) return { step, nodes: [] };

  const nodes: HeatNode[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const level = ((density[row * cols + col] ?? 0) / max) ** GAMMA;
      if (level >= MIN_LEVEL) nodes.push({ x: col * step, y: row * step, level });
    }
  }
  return { step, nodes };
}

/** Group nodes into a few colour bands so the layer is a handful of SVG paths, not thousands. */
export function groupByBand(nodes: readonly HeatNode[], bands = 14): Map<number, HeatNode[]> {
  const grouped = new Map<number, HeatNode[]>();
  for (const node of nodes) {
    const band = Math.min(bands - 1, Math.floor(node.level * bands));
    const list = grouped.get(band);
    if (list) list.push(node);
    else grouped.set(band, [node]);
  }
  return grouped;
}
