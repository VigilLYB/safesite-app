import { heatRamp, palette, severityTokens, type Severity } from "./tokens";

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return -1; // grey
  const d = max - min;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const isRed = (hex: string) => {
  const h = hue(hex);
  return h >= 0 && (h <= 12 || h >= 345);
};
const hexes = (obj: Record<string, string>) =>
  Object.values(obj).filter((v) => /^#[0-9A-F]{6}$/i.test(v));

describe("design tokens", () => {
  it("keeps red exclusive to Critical", () => {
    const others = (["LOW", "MEDIUM", "HIGH"] as Severity[]).flatMap((s) =>
      hexes({ ...severityTokens[s] }),
    );
    const interface_ = [...hexes({ ...palette }), ...heatRamp];
    for (const colour of [...others, ...interface_]) expect(isRed(colour)).toBe(false);
    expect(isRed(severityTokens.CRITICAL.fill)).toBe(true);
    expect(isRed(severityTokens.CRITICAL.tint)).toBe(true);
  });

  it("keeps the interface itself neutral grey (only severity carries hue)", () => {
    const tinted = hexes({ ...palette }).filter((c) => c !== palette.focus);
    for (const colour of tinted) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(colour.slice(i, i + 2), 16)) as [
        number,
        number,
        number,
      ];
      expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(24);
    }
  });

  it("meets 4.5:1 for ink text on every severity badge and surface", () => {
    for (const s of ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as Severity[]) {
      expect(contrast(palette.ink, severityTokens[s].tint)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(palette.ink, palette.page)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(palette.ink2, palette.page)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(palette.ink2, palette.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(palette.onInk, palette.ink)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(severityTokens.CRITICAL.text, palette.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("meets 3:1 for the field bar and focus ring", () => {
    expect(contrast(palette.fieldBar, palette.surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(palette.fieldBar, palette.grey100)).toBeGreaterThanOrEqual(3);
    expect(contrast(palette.focus, palette.page)).toBeGreaterThanOrEqual(3);
  });

  it("has a heatmap ramp that gets strictly darker", () => {
    const lum = heatRamp.map(luminance);
    for (let i = 1; i < lum.length; i++)
      expect(lum[i] as number).toBeLessThan(lum[i - 1] as number);
  });
});
