import Svg, { Path } from "react-native-svg";
import { palette, severityTokens, type Severity } from "@/lib/theme";

const SHAPE: Record<Severity, { body: string; glyph: string; circle?: true }> = {
  LOW: { body: "", glyph: "M12 11v6M12 7.5h.01", circle: true },
  MEDIUM: { body: "M12 3L22 20H2z", glyph: "M12 10v4.5M12 17.2h.01" },
  HIGH: { body: "M12 1.5L22.5 12 12 22.5 1.5 12z", glyph: "M12 7v6M12 16h.01" },
  CRITICAL: { body: "M8 2h8l6 6v8l-6 6H8l-6-6V8z", glyph: "M12 7v7M12 17.2h.01" },
};

export interface SeverityShapeProps {
  severity: Severity;
  size?: number | undefined;
  /** "badge" draws on the tinted badge background; "solid" on a plain surface. */
  surface?: "solid" | "badge" | undefined;
}

/** Severity is shape + colour + label: circle, triangle, diamond, octagon. */
export function SeverityShape({ severity, size = 20, surface = "solid" }: SeverityShapeProps) {
  const tokens = severityTokens[severity];
  const shape = SHAPE[severity];
  const fill = surface === "badge" ? tokens.badgeShape : tokens.fill;
  const glyph = surface === "badge" ? tokens.badgeGlyph : tokens.glyph;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {shape.circle ? (
        <Path d="M12 3a9 9 0 100 18 9 9 0 000-18z" fill={fill} />
      ) : (
        <Path d={shape.body} fill={fill} stroke={fill} strokeWidth={1.5} strokeLinejoin="round" />
      )}
      <Path
        d={shape.glyph}
        stroke={glyph || palette.ink}
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
