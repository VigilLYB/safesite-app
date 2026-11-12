import { heatRamp } from "./tokens";

const toRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/** Skip the near-white end of the ramp so even the faintest heat is visible over a white plan. */
const RAMP_START = 0.14;

/**
 * A continuous colour for a heat level (0 = barely any reports, 1 = the hottest spot), blended
 * between the discrete ramp tokens. Hex values only live in tokens.ts; this just interpolates them.
 */
export function heatColor(level: number): string {
  const clamped = Math.min(Math.max(level, 0), 1);
  const t = RAMP_START + (1 - RAMP_START) * clamped;
  const position = t * (heatRamp.length - 1);
  const lower = Math.floor(position);
  const upper = Math.min(lower + 1, heatRamp.length - 1);
  const mix = position - lower;
  const a = toRgb(heatRamp[lower] as string);
  const b = toRgb(heatRamp[upper] as string);
  const channel = (i: 0 | 1 | 2) => Math.round(a[i] + (b[i] - a[i]) * mix);
  return `rgb(${channel(0)},${channel(1)},${channel(2)})`;
}

/** Heat gets more opaque as it gets denser, so sparse areas stay light and hot spots are solid. */
export const heatOpacity = (level: number): number => 0.3 + 0.6 * Math.min(Math.max(level, 0), 1);
