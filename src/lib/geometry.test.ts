import { clampPoint, isInsideBounds, pointInPolygon, polygonsOverlap } from "./geometry";

const square = (x: number, y: number, s: number): [number, number][] => [
  [x, y],
  [x + s, y],
  [x + s, y + s],
  [x, y + s],
];

describe("geometry", () => {
  it("clamps to the blueprint and rounds to 2 decimals", () => {
    expect(clampPoint(-5, 1200.456, 1000, 800)).toEqual([0, 800]);
    expect(clampPoint(10.126, 20.994, 1000, 800)).toEqual([10.13, 20.99]);
    expect(isInsideBounds(1000, 800, 1000, 800)).toBe(true);
    expect(isInsideBounds(1001, 0, 1000, 800)).toBe(false);
  });
  it("point in polygon", () => {
    expect(pointInPolygon(5, 5, square(0, 0, 10))).toBe(true);
    expect(pointInPolygon(15, 5, square(0, 0, 10))).toBe(false);
  });
  it("detects overlapping areas, including crossing edges with no contained vertex", () => {
    expect(polygonsOverlap(square(0, 0, 10), square(5, 5, 10))).toBe(true);
    expect(polygonsOverlap(square(0, 0, 10), square(20, 20, 5))).toBe(false);
    const wide: [number, number][] = [
      [0, 4],
      [10, 4],
      [10, 6],
      [0, 6],
    ];
    const tall: [number, number][] = [
      [4, 0],
      [6, 0],
      [6, 10],
      [4, 10],
    ];
    expect(polygonsOverlap(wide, tall)).toBe(true);
  });
});
