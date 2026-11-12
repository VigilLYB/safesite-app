import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { space } from "@/lib/theme";

type Gap = keyof typeof space;

interface StackProps {
  children: ReactNode;
  gap?: Gap | undefined;
  align?: ViewStyle["alignItems"] | undefined;
  justify?: ViewStyle["justifyContent"] | undefined;
  wrap?: boolean | undefined;
  style?: ViewStyle | undefined;
}

export function Stack({ children, gap = 3, align, justify, style }: Omit<StackProps, "wrap">) {
  return (
    <View style={[{ gap: space[gap], alignItems: align, justifyContent: justify }, style]}>
      {children}
    </View>
  );
}

export function Row({
  children,
  gap = 3,
  align = "center",
  justify,
  wrap = false,
  style,
}: StackProps) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          gap: space[gap],
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? "wrap" : "nowrap",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
