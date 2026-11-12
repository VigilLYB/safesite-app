import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useBreakpoint } from "@/lib/responsive";
import { layout, palette, space } from "@/lib/theme";

export interface ScreenProps {
  children: ReactNode;
  /** false for screens that manage their own scrolling (lists). */
  scroll?: boolean | undefined;
  edges?: readonly Edge[] | undefined;
  /** Sticky bottom area, e.g. the single primary action. */
  footer?: ReactNode | undefined;
  onRefresh?: () => void;
  refreshing?: boolean | undefined;
  testID?: string | undefined;
}

/** Safe area, page background, centred max-width content and responsive gutters. */
export function Screen({
  children,
  scroll = true,
  edges = ["top", "left", "right"],
  footer,
  onRefresh,
  refreshing = false,
  testID,
}: ScreenProps) {
  const { isTablet } = useBreakpoint();
  const gutter = isTablet ? space[5] : space[4];
  const content = [styles.content, { paddingHorizontal: gutter }];

  return (
    <SafeAreaView edges={edges} style={styles.safe} testID={testID}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[content, styles.scrollContent]}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={palette.ink}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, content]}>{children}</View>
        )}
        {footer ? (
          <View style={[styles.footer, { paddingHorizontal: gutter }]}>{footer}</View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.page },
  flex: { flex: 1 },
  content: {
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    alignSelf: "center",
    paddingTop: space[4],
  },
  scrollContent: { paddingBottom: space[6], gap: space[4] },
  footer: {
    paddingTop: space[3],
    paddingBottom: space[3],
    backgroundColor: palette.page,
    gap: space[2],
  },
});
