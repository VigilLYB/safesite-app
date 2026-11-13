import { heatColor, heatOpacity, heatRamp } from "@/lib/theme";
import { buildHeatField, groupByBand, MIN_LEVEL, type HeatInputCell } from "./heat";

const cell = (x: number, y: number, count = 1, score = count): HeatInputCell => ({
  centerX: x,
  centerY: y,
  count,
  score,
});
const plan = { widthPx: 1000, heightPx: 800, cellSize: 50 } as const;
/** Level of the raster square whose centre is nearest to (x, y). */
const levelAt = (field: ReturnType<typeof buildHeatField>, x: number, y: number) => {
  const half = field.step / 2;
  const hit = field.nodes.find(
    (n) => Math.abs(n.x + half - x) <= half + 1e-6 && Math.abs(n.y + half - y) <= half + 1e-6,
  );
  return hit?.level ?? 0;
};

describe("heat field", () => {
  it("is empty with no reports", () => {
    expect(buildHeatField({ ...plan, cells: [], metric: "count" }).nodes).toEqual([]);
    expect(
      buildHeatField({ ...plan, cells: [cell(100, 100, 0, 0)], metric: "count" }).nodes,
    ).toEqual([]);
  });

  it("the hottest node is exactly 1 and nothing exceeds it", () => {
    const { nodes } = buildHeatField({
      ...plan,
      cells: [cell(200, 200, 5), cell(700, 500, 2)],
      metric: "count",
    });
    expect(Math.max(...nodes.map((n) => n.level))).toBeCloseTo(1, 5);
    expect(nodes.every((n) => n.level <= 1 && n.level >= MIN_LEVEL)).toBe(true);
  });

  it("more reports in an area make it hotter than a lone report", () => {
    const field = buildHeatField({
      ...plan,
      metric: "count",
      cells: [cell(200, 200, 1), cell(700, 500, 6)],
    });
    expect(levelAt(field, 700, 500)).toBeGreaterThan(levelAt(field, 200, 200));
    expect(levelAt(field, 200, 200)).toBeGreaterThan(0); // the lone report still glows
  });

  it("neighbouring cells add up; the empty middle between distant ones stays unpainted", () => {
    const apart = buildHeatField({
      ...plan,
      metric: "count",
      cells: [cell(200, 200), cell(800, 600)],
    });
    const together = buildHeatField({
      ...plan,
      metric: "count",
      cells: [cell(200, 200), cell(240, 200)],
    });
    expect(levelAt(together, 220, 200)).toBeGreaterThan(0.95);
    expect(levelAt(apart, 500, 400)).toBe(0);
  });

  it("the heat fades with distance", () => {
    const field = buildHeatField({ ...plan, metric: "count", cells: [cell(500, 400, 4)] });
    expect(levelAt(field, 520, 400)).toBeGreaterThan(levelAt(field, 640, 400));
  });

  it("score and count give different pictures when severity differs", () => {
    const cells = [cell(200, 200, 5, 5), cell(700, 500, 1, 15)]; // few but critical
    const byCount = buildHeatField({ ...plan, cells, metric: "count" });
    const byScore = buildHeatField({ ...plan, cells, metric: "score" });
    expect(levelAt(byCount, 200, 200)).toBeGreaterThan(levelAt(byCount, 700, 500));
    expect(levelAt(byScore, 700, 500)).toBeGreaterThan(levelAt(byScore, 200, 200));
  });

  it("never draws outside the plan", () => {
    const field = buildHeatField({
      ...plan,
      metric: "count",
      cells: [cell(5, 5, 3), cell(995, 795, 3)],
    });
    for (const n of field.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.y).toBeGreaterThanOrEqual(0);
      expect(n.x).toBeLessThan(plan.widthPx);
      expect(n.y).toBeLessThan(plan.heightPx);
    }
  });

  it("a small cell size gives a tighter glow than a large one", () => {
    const tight = buildHeatField({
      ...plan,
      cellSize: 10,
      metric: "count",
      cells: [cell(500, 400, 3)],
    });
    const wide = buildHeatField({
      ...plan,
      cellSize: 100,
      metric: "count",
      cells: [cell(500, 400, 3)],
    });
    expect(wide.nodes.length).toBeGreaterThan(tight.nodes.length);
  });

  it("groups nodes into a few colour bands", () => {
    const { nodes } = buildHeatField({
      ...plan,
      metric: "count",
      cells: [cell(300, 300, 8), cell(600, 400, 3)],
    });
    const bands = groupByBand(nodes, 14);
    expect(bands.size).toBeLessThanOrEqual(14);
    expect([...bands.values()].reduce((n, list) => n + list.length, 0)).toBe(nodes.length);
  });
});

describe("heat colour", () => {
  const rgb = (s: string) => s.match(/\d+/g)!.map(Number) as [number, number, number];
  const lum = (s: string) => {
    const [r, g, b] = rgb(s).map((v) => v / 255) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  /** Hue in degrees and saturation (0..1) of an rgb triple. */
  const hs = ([r, g, b]: [number, number, number]): [number, number] => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    if (d === 0) return [0, 0];
    const h =
      ((max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 + 360) %
      360;
    return [h, d / max];
  };
  const critical = [0xe5, 0x17, 0x3f] as const; // severityTokens.CRITICAL.fill

  it("ends in deep purple instead of brown", () => {
    expect(heatRamp.at(-1)).toBe("#3B0F70");
    const [r, g, b] = rgb(heatColor(1));
    expect(b).toBeGreaterThan(g); // blue-violet, not brown
    expect(b).toBeGreaterThan(r);
    expect(heatColor(1)).toBe("rgb(59,15,112)");
  });

  it("starts pale and passes through yellow, amber and orange on the way", () => {
    expect(heatRamp.slice(0, 4)).toEqual(["#FFF4CC", "#FFD966", "#F6A93B", "#E07B24"]);
  });

  it("gets continuously darker as the level rises", () => {
    let previous = Infinity;
    for (let i = 0; i <= 30; i++) {
      const l = lum(heatColor(i / 30));
      expect(l).toBeLessThanOrEqual(previous);
      previous = l;
    }
    expect(lum(heatColor(1))).toBeLessThan(lum(heatColor(0)));
  });

  it("clamps out-of-range levels", () => {
    expect(heatColor(-5)).toBe(heatColor(0));
    expect(heatColor(9)).toBe(heatColor(1));
  });

  it("never produces anything that looks like the Critical red", () => {
    for (let i = 0; i <= 60; i++) {
      const colour = rgb(heatColor(i / 60));
      const [hue, saturation] = hs(colour);
      // Between orange and rose the blend passes through muted coral. That is fine; a vivid red is not.
      if (hue <= 12 || hue >= 345) expect(saturation).toBeLessThan(0.7);
      const distance = Math.hypot(
        colour[0] - critical[0],
        colour[1] - critical[1],
        colour[2] - critical[2],
      );
      expect(distance).toBeGreaterThan(60);
    }
  });

  it("gets more opaque with density", () => {
    expect(heatOpacity(1)).toBeGreaterThan(heatOpacity(0));
    expect(heatOpacity(0)).toBeGreaterThanOrEqual(0.3);
    expect(heatOpacity(1)).toBeLessThanOrEqual(0.9);
  });
});
