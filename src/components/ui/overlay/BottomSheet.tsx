import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { Easing, FadeIn, SlideInDown } from "react-native-reanimated";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBreakpoint } from "@/lib/responsive";
import { motion, palette, radii, space } from "@/lib/theme";
import { IconButton } from "../actions";
import { Text } from "../Text";

export interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Modal sheet with a visible close control, a scrim dismiss and Android back support.
 * The scrim fades while the panel rises (the whole modal no longer slides as one block).
 */
export function BottomSheet({ visible, title, onClose, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { isTablet } = useBreakpoint();
  const reduced = useReducedMotion();
  const ease = Easing.out(Easing.cubic);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          style={StyleSheet.absoluteFill}
          entering={FadeIn.duration(reduced ? 0 : motion.sheet)}
        >
          <Pressable
            style={styles.scrim}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>
        <Animated.View
          entering={SlideInDown.duration(reduced ? 0 : motion.sheet).easing(ease)}
          accessibilityViewIsModal
          style={[
            styles.sheet,
            isTablet && styles.sheetWide,
            { paddingBottom: insets.bottom + space[4] },
          ]}
        >
          <View style={styles.header}>
            <Text variant="heading" accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <IconButton icon="x" label="Close" onPress={onClose} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: palette.scrim },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    maxHeight: "85%",
    paddingHorizontal: space[4],
    paddingTop: space[3],
  },
  sheetWide: { alignSelf: "center", width: 560, borderRadius: radii.sheet, marginBottom: space[6] },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[3],
  },
  title: { flex: 1 },
  body: { gap: space[1], paddingVertical: space[2] },
});
