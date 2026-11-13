import { useCallback, useState } from "react";
import type { ViewStyle } from "react-native";
import { palette } from "@/lib/theme";

const RING: ViewStyle = {
  outlineColor: palette.focus,
  outlineWidth: 3,
  outlineOffset: 2,
  outlineStyle: "solid",
};

/**
 * On web, only keyboard-style focus (`:focus-visible`) shows the ring; a mouse click or tap does
 * not, so pressing a field or button never leaves a blue outline behind.
 */
function isKeyboardFocus(event: unknown): boolean {
  const target = (event as { target?: { matches?: (selector: string) => boolean } } | undefined)
    ?.target;
  if (!target?.matches) return true; // native: switch control / hardware keyboard focus
  try {
    return target.matches(":focus-visible");
  } catch {
    return true;
  }
}

/** Visible keyboard / switch-control focus. Never remove focus indication. */
export function useFocusRing() {
  const [focused, setFocused] = useState(false);
  const onFocus = useCallback((event?: unknown) => setFocused(isKeyboardFocus(event)), []);
  const onBlur = useCallback(() => setFocused(false), []);
  return { focused, handlers: { onFocus, onBlur }, ringStyle: focused ? RING : undefined };
}
