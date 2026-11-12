import Svg, { Path, Rect } from "react-native-svg";
import { palette } from "@/lib/theme";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      accessibilityLabel="SafeSite"
      accessibilityRole="image"
    >
      <Rect x={2} y={2} width={28} height={28} rx={6} fill={palette.ink} />
      <Path d="M2 19h11v11" stroke={palette.page} strokeWidth={3.5} fill="none" />
      <Path
        d="M10 12l4 4 8-8"
        stroke={palette.surface}
        strokeWidth={3.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
