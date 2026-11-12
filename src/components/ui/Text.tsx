import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { palette, severityTokens, typeScale, type TextVariant } from "@/lib/theme";

export type TextTone = "default" | "muted" | "inverse" | "critical";

const TONE: Record<TextTone, string> = {
  default: palette.ink,
  muted: palette.ink2,
  inverse: palette.onInk,
  critical: severityTokens.CRITICAL.text,
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant | undefined;
  tone?: TextTone | undefined;
}

/** The only text primitive. Scales with the system font size, capped so layouts survive. */
export function Text({ variant = "body", tone = "default", style, ...rest }: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[typeScale[variant], { color: TONE[tone] }, style]}
    />
  );
}
