import Svg, { Path } from "react-native-svg";
import { palette } from "@/lib/theme";

const PATHS = {
  wifi: "M2 9a15 15 0 0120 0M5.5 12.5a10 10 0 0113 0M9 16a5 5 0 016 0M12 19.5h.01",
  home: "M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6",
  plus: "M12 5v14M5 12h14",
  list: "M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  bell: "M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z",
  mic: "M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3zM6 11a6 6 0 0012 0M12 17v4",
  chevron: "M9 6l6 6-6 6",
  down: "M6 9l6 6 6-6",
  back: "M15 6l-6 6 6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  pin: "M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  map: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14",
  chart: "M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8",
  clip: "M9 4h6l1 2h3v15H5V6h3zM9 12h6M9 16h4",
  tasks: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4",
  warn: "M12 3l10 18H2zM12 10v5M12 18h.01",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  filter: "M3 5h18l-7 8v6l-4 2v-8z",
  x: "M6 6l12 12M18 6L6 18",
  play: "M8 5l11 7-11 7z",
  stop: "M7 7h10v10H7z",
  logout: "M9 4H5v16h4M16 8l4 4-4 4M20 12H9",
  refresh: "M20 11a8 8 0 10-2.3 5.7M20 4v7h-7",
  history: "M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5M12 7v5l3 2",
  users: "M9 11a3 3 0 100-6 3 3 0 000 6zM3 20a6 6 0 0112 0M17 11a3 3 0 100-6M21 20a6 6 0 00-4-5.6",
  link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3A4 4 0 0011 18.7l1-1",
} as const;

export type IconName = keyof typeof PATHS;

export interface IconProps {
  name: IconName;
  size?: number | undefined;
  color?: string | undefined;
}

/** Decorative by default: put the accessible name on the control that contains it. */
export function Icon({ name, size = 24, color = palette.ink }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d={PATHS[name]} />
    </Svg>
  );
}
