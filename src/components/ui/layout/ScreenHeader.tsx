import { Fragment, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { palette, space } from "@/lib/theme";
import { IconButton } from "../actions";
import { Icon } from "../icons";
import { Text } from "../Text";

export interface Crumb {
  label: string;
  onPress?: (() => void) | undefined;
}

export interface ScreenHeaderProps {
  title: string;
  eyebrow?: string | undefined;
  subtitle?: string | undefined;
  onBack?: () => void;
  /**
   * Where this screen sits, e.g. Incidents / Machine stuck. Shown as a one-line trail above the
   * title (truncated on narrow phones); each crumb with onPress goes back to that level.
   */
  trail?: readonly Crumb[] | undefined;
  actions?: ReactNode | undefined;
  /** Optional id for the title text (tests and deep links read it). */
  titleTestID?: string | undefined;
}

export function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  onBack,
  trail,
  actions,
  titleTestID,
}: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      {onBack ? <IconButton icon="back" label="Back" onPress={onBack} /> : null}
      <View style={styles.titles}>
        {trail && trail.length > 0 ? (
          <View style={styles.trail} accessibilityRole="none" testID="breadcrumbs">
            {trail.map((crumb, index) => (
              <Fragment key={`${crumb.label}-${index}`}>
                {crumb.onPress ? (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`Back to ${crumb.label}`}
                    onPress={crumb.onPress}
                    hitSlop={8}
                    style={styles.crumbPress}
                  >
                    <Text variant="caption" tone="muted" numberOfLines={1} style={styles.crumb}>
                      {crumb.label}
                    </Text>
                  </Pressable>
                ) : (
                  <Text variant="caption" tone="muted" numberOfLines={1} style={styles.crumb}>
                    {crumb.label}
                  </Text>
                )}
                <Icon name="chevron" size={12} color={palette.grey400} />
              </Fragment>
            ))}
          </View>
        ) : eyebrow ? (
          <Text variant="caption" tone="muted">
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="title" accessibilityRole="header" numberOfLines={2} testID={titleTestID}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: space[2] },
  titles: { flex: 1, gap: 2, paddingTop: 2 },
  trail: { flexDirection: "row", alignItems: "center", gap: 2, flexWrap: "nowrap" },
  crumbPress: { flexShrink: 1 },
  crumb: { flexShrink: 1, maxWidth: 160 },
  actions: { flexDirection: "row", gap: space[2], alignItems: "center" },
});
