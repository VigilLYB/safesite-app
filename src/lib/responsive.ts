import { useWindowDimensions } from "react-native";
import { breakpoints } from "@/lib/theme";

export interface Breakpoint {
  width: number;
  isTablet: boolean;
  isDesktop: boolean;
}

/** Mobile-first: phone is the base; tablet and desktop opt in. */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  return { width, isTablet: width >= breakpoints.tablet, isDesktop: width >= breakpoints.desktop };
}
