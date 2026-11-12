/**
 * SafeSite design tokens (monochrome, flat).
 * The interface is greyscale: hierarchy comes from shades of grey and hairline borders, never from
 * heavy fills or offset shadows. Colour is only for meaning (severity, heatmaps, warnings) and red
 * belongs to CRITICAL alone.
 * This is the only file allowed to contain raw hex values.
 */

export const palette = {
  ink: "#16181D",
  ink2: "#4A4F59",
  inkPressed: "#2F333A",
  hover: "#FAFAFB",
  page: "#F4F5F7",
  surface: "#FFFFFF",
  onInk: "#FFFFFF",
  grey50: "#F8F9FA",
  grey100: "#EEF0F2",
  grey200: "#E2E5E9",
  grey300: "#CDD1D7",
  grey400: "#A1A7B0",
  grey500: "#7A808A",
  grey600: "#5A6069",
  grey700: "#3A3F47",
  /** Hairline borders on cards, fields and dividers. */
  border: "#DEE1E6",
  /** Control outlines that must read as an edge (checkbox, radio, field): >= 3:1. */
  fieldBar: "#7A808A",
  focus: "#0B3FD1",
  scrim: "rgba(22,24,29,0.4)",
} as const;

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SeverityTokens {
  /** Shape, edge bar and chart colour. */
  readonly fill: string;
  /** Badge background (ink text on top). */
  readonly tint: string;
  /** Glyph colour drawn inside the solid shape. */
  readonly glyph: string;
  /** Shape and glyph colours when drawn on the tint badge background. */
  readonly badgeShape: string;
  readonly badgeGlyph: string;
  /** Text-on-white colour for numbers that must read as this severity. */
  readonly text: string;
}

export const severityTokens: Record<Severity, SeverityTokens> = {
  LOW: {
    fill: "#6FA8EE",
    tint: "#DCEBFC",
    glyph: "#16181D",
    badgeShape: "#6FA8EE",
    badgeGlyph: "#16181D",
    text: "#16181D",
  },
  MEDIUM: {
    fill: "#F2B705",
    tint: "#FFEFA8",
    glyph: "#16181D",
    badgeShape: "#F2B705",
    badgeGlyph: "#16181D",
    text: "#16181D",
  },
  HIGH: {
    fill: "#F58220",
    tint: "#FFD2AE",
    glyph: "#16181D",
    badgeShape: "#F58220",
    badgeGlyph: "#16181D",
    text: "#16181D",
  },
  CRITICAL: {
    fill: "#E5173F",
    tint: "#FF6B7F",
    glyph: "#FFFFFF",
    badgeShape: "#FFFFFF",
    badgeGlyph: "#C8102E",
    text: "#B0102B",
  },
};

/**
 * Heatmap ramp: warm, single-hue family (amber to brown) whose luminance falls strictly, so it still
 * reads in greyscale and for colour-blind viewers. No red: red stays exclusive to Critical.
 */
export const heatRamp = ["#FFF4CC", "#FFD966", "#F6A93B", "#E07B24", "#A84A12", "#5C2408"] as const;

export const radii = { control: 4, card: 6, sheet: 10, pill: 999 } as const;

/** 4pt grid. */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 } as const;

/** Minimum touch heights: workers wear gloves, desk users use a pointer or a finger. */
export const touch = { worker: 56, desk: 44 } as const;

export const breakpoints = { tablet: 768, desktop: 1024, wide: 1440 } as const;

export const layout = { contentMaxWidth: 1200, sidebarWidth: 220, listPaneWidth: 380 } as const;

export const fonts = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  mono: "IBMPlexMono_500Medium",
  monoBold: "IBMPlexMono_600SemiBold",
} as const;

export type TextVariant =
  "display" | "title" | "heading" | "bodyLg" | "body" | "label" | "caption" | "mono" | "kpi";

/** One step smaller than before throughout: dense enough for desk use, still >= 11pt for captions. */
export const typeScale: Record<
  TextVariant,
  { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing?: number }
> = {
  display: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  title: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  bodyLg: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  mono: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 16 },
  kpi: { fontFamily: fonts.monoBold, fontSize: 28, lineHeight: 34 },
};

/** Durations (ms). Motion is short and eased; it is skipped entirely under reduced motion. */
export const motion = { press: 100, state: 180, sheet: 220 } as const;

export const zIndex = { base: 0, sticky: 10, overlay: 40, modal: 100 } as const;
