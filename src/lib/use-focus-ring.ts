import { useCallback, useState } from "react";
import type { ViewStyle } from "react-native";
import { palette } from "@/lib/theme";

const RING: ViewStyle = {
  outlineColor: palette.focus,
  outlineWidth: 3,
  outlineOffset: 2,
  outlineStyle: "solid",
};

/** Visible keyboard / switch-control focus. Never remove focus indication. */
export function useFocusRing() {
  const [focused, setFocused] = useState(false);
  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback(() => setFocused(false), []);
  return { focused, handlers: { onFocus, onBlur }, ringStyle: focused ? RING : undefined };
}
