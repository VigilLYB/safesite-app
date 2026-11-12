import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Icon, Text, type IconName } from "@/components/ui";
import { palette, radii, space } from "@/lib/theme";

export interface StateAction {
  label: string;
  onPress: () => void;
  testID?: string | undefined;
}

export interface StateLayoutProps {
  icon: IconName;
  title: string;
  message?: string | undefined;
  /** Shown as "Reference: …" so people can quote it when they report the problem. */
  reference?: string | undefined;
  primary?: StateAction | undefined;
  secondary?: StateAction | undefined;
  /** "page" fills a whole screen; "inline" sits inside a section or tab. */
  size?: "page" | "inline" | undefined;
  role?: "alert" | "summary" | undefined;
  testID?: string | undefined;
  children?: ReactNode;
}

/**
 * The one layout for empty, error and system pages: an icon in a soft circle, a title, a short
 * explanation, an optional reference id, and up to two actions. Flat, centred, never a spinner.
 */
export function StateLayout({
  icon,
  title,
  message,
  reference,
  primary,
  secondary,
  size = "inline",
  role = "summary",
  testID,
  children,
}: StateLayoutProps) {
  const page = size === "page";
  return (
    <View style={[styles.box, page && styles.page]} accessibilityRole={role} testID={testID}>
      <View style={[styles.badge, page && styles.badgePage]}>
        <Icon name={icon} size={page ? 28 : 22} color={palette.ink2} />
      </View>
      <Text variant={page ? "title" : "heading"} accessibilityRole="header" style={styles.center}>
        {title}
      </Text>
      {message ? (
        <Text tone="muted" style={[styles.center, styles.message]}>
          {message}
        </Text>
      ) : null}
      {reference ? (
        <Text variant="mono" tone="muted" selectable style={styles.reference}>
          Reference: {reference}
        </Text>
      ) : null}
      {children}
      {primary || secondary ? (
        <View style={styles.actions}>
          {primary ? (
            <Button
              label={primary.label}
              onPress={primary.onPress}
              size="desk"
              testID={primary.testID}
            />
          ) : null}
          {secondary ? (
            <Button
              label={secondary.label}
              onPress={secondary.onPress}
              variant="secondary"
              size="desk"
              testID={secondary.testID}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    gap: space[2],
    paddingVertical: space[6],
    paddingHorizontal: space[4],
  },
  page: { flexGrow: 1, justifyContent: "center", paddingVertical: space[8], gap: space[3] },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.grey100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space[1],
  },
  badgePage: { width: 64, height: 64, borderRadius: 32 },
  center: { textAlign: "center" },
  message: { maxWidth: 360 },
  reference: {
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radii.control,
    backgroundColor: palette.grey50,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: space[2],
    marginTop: space[2],
  },
});
