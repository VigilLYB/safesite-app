export type Point = [number, number];

export const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Clamp a pick/drag/polygon point to `0..width` x `0..height`, rounded to 2 decimals (guide §6). */
export function clampPoint(x: number, y: number, widthPx: number, heightPx: number): Point {
  const cx = Math.min(Math.max(x, 0), widthPx);
  const cy = Math.min(Math.max(y, 0), heightPx);
  return [round2(cx), round2(cy)];
}

export const isInsideBounds = (x: number, y: number, widthPx: number, heightPx: number): boolean =>
  x >= 0 && y >= 0 && x <= widthPx && y <= heightPx;

export function polygonCentroid(points: readonly Point[]): Point {
  if (points.length === 0) return [0, 0];
  const sum = points.reduce<Point>((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}

/** Ray casting. Points on an edge count as inside, which is how the server assigns an area. */
export function pointInPolygon(x: number, y: number, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i] as Point;
    const [xj, yj] = polygon[j] as Point;
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const cross = (p: Point, q: Point, r: Point) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** True when two polygons share any area: a pin in the overlap goes to the first by name. */
export function polygonsOverlap(a: readonly Point[], b: readonly Point[]): boolean {
  if (a.length < 3 || b.length < 3) return false;
  if (a.some(([x, y]) => pointInPolygon(x, y, b))) return true;
  if (b.some(([x, y]) => pointInPolygon(x, y, a))) return true;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (
        segmentsIntersect(
          a[i] as Point,
          a[(i + 1) % a.length] as Point,
          b[j] as Point,
          b[(j + 1) % b.length] as Point,
        )
      ) {
        return true;
      }
    }
  }
  return false;
}
