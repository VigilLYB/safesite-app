import { Fragment, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { palette, space, touch } from "@/lib/theme";
import { IconButton } from "../actions";
import { Icon } from "../icons";
import { Text } from "../Text";
import { useHeaderExtra } from "./HeaderExtra";

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
  // The shell's shared control (e.g. the manager's Report button), shown on every page.
  const extra = useHeaderExtra();
  const hasActions = Boolean(actions) || Boolean(extra);
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
        {/* Actions share the title's own line, so they sit level with the heading. */}
        <View style={[styles.titleRow, hasActions && styles.titleRowWithActions]}>
          <Text
            variant="title"
            accessibilityRole="header"
            numberOfLines={2}
            testID={titleTestID}
            style={styles.titleText}
          >
            {title}
          </Text>
          {hasActions ? (
            <View style={styles.actions} testID="header-actions">
              {actions}
              {extra}
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text variant="body" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: space[2] },
  titles: { flex: 1, gap: 2, paddingTop: 2 },
  trail: { flexDirection: "row", alignItems: "center", gap: 2, flexWrap: "nowrap" },
  crumbPress: { flexShrink: 1 },
  crumb: { flexShrink: 1, maxWidth: 160 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  titleRowWithActions: { minHeight: touch.desk },
  titleText: { flex: 1 },
  actions: { flexDirection: "row", gap: space[2], alignItems: "center" },
});
