/**
 * SafeSite design tokens (monochrome / flat / borderless).
 * The interface is greyscale; the only colour is severity, and red belongs to CRITICAL alone.
 * This is the only file allowed to contain raw hex values.
 */

export const palette = {
  ink: "#16181D",
  ink2: "#4A4F59",
  inkPressed: "#3D434D",
  hover: "#FAFAFB",
  page: "#F2F3F5",
  surface: "#FFFFFF",
  onInk: "#FFFFFF",
  grey100: "#E8EAED",
  grey200: "#D9DCE1",
  grey300: "#C3C7CE",
  fieldBar: "#6B7280",
  focus: "#0B3FD1",
  scrim: "rgba(22,24,29,0.5)",
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
    fill: "#2F6FD6",
    tint: "#CFE3FB",
    glyph: "#FFFFFF",
    badgeShape: "#2F6FD6",
    badgeGlyph: "#FFFFFF",
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

/** Greyscale, luminance-monotonic heatmap ramp: safe for every kind of colour blindness. */
export const heatRamp = ["#F3F4F6", "#D5D9DF", "#A3AAB5", "#6E7683", "#3D434D", "#16181D"] as const;

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

export const typeScale: Record<
  TextVariant,
  { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing?: number }
> = {
  display: { fontFamily: fonts.bold, fontSize: 36, lineHeight: 42, letterSpacing: -0.7 },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 },
  bodyLg: { fontFamily: fonts.medium, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  mono: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 18 },
  kpi: { fontFamily: fonts.monoBold, fontSize: 34, lineHeight: 40 },
};

export const motion = { press: 100, state: 150, sheet: 260 } as const;

export const zIndex = { base: 0, sticky: 10, overlay: 40, modal: 100 } as const;
