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
  testID?: string | undefined;
}

export function Stack({
  children,
  gap = 3,
  align,
  justify,
  style,
  testID,
}: Omit<StackProps, "wrap">) {
  return (
    <View
      testID={testID}
      style={[{ gap: space[gap], alignItems: align, justifyContent: justify }, style]}
    >
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
  testID,
}: StackProps) {
  return (
    <View
      testID={testID}
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
