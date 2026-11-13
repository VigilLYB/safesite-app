import { useState, type ReactNode } from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
} from "react-native";
import { fonts, palette, radii, space, touch, typeScale } from "@/lib/theme";
import { Icon } from "../icons";
import { Text } from "../Text";

export interface TextFieldProps extends Pick<
  TextInputProps,
  | "value"
  | "onChangeText"
  | "placeholder"
  | "keyboardType"
  | "secureTextEntry"
  | "autoComplete"
  | "autoCapitalize"
  | "autoCorrect"
  | "returnKeyType"
  | "onSubmitEditing"
  | "multiline"
  | "maxLength"
  | "textContentType"
> {
  label: string;
  helper?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  /** A control inside the box at its right edge (e.g. a calendar button). */
  trailing?: ReactNode;
  testID?: string | undefined;
}

/**
 * Visible label above, helper below, error below with an icon: never placeholder-only.
 * Flat: a white box with a hairline outline that darkens on focus and on error.
 */
export function TextField({
  label,
  helper,
  error,
  required,
  multiline,
  trailing,
  testID,
  ...input
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? palette.ink : focused ? palette.ink : palette.grey300;

  return (
    <View style={styles.field}>
      <Text variant="label">
        {label}
        {required ? " *" : ""}
      </Text>
      <View
        style={[
          styles.box,
          { borderColor },
          (focused || error) && styles.boxStrong,
          trailing ? styles.boxRow : null,
        ]}
      >
        <TextInput
          {...input}
          multiline={multiline}
          testID={testID}
          accessibilityLabel={label}
          accessibilityHint={helper}
          aria-invalid={Boolean(error)}
          placeholderTextColor={palette.grey500}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            multiline && styles.multiline,
            trailing ? styles.flex : null,
            Platform.OS === "web" && NO_OUTLINE,
          ]}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {error ? (
        <View
          style={styles.row}
          accessible
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <Icon name="warn" size={16} />
          <Text variant="caption" style={styles.flex}>
            {error}
          </Text>
        </View>
      ) : helper ? (
        <Text variant="caption" tone="muted">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * The box's darker, thicker border is the focus indicator, so the browser's own focus outline
 * (`outline-style: auto`, which ignores a zero width) is turned off on web.
 */
const NO_OUTLINE = { outlineStyle: "none", outlineWidth: 0 } as unknown as TextStyle;

const styles = StyleSheet.create({
  field: { gap: space[1] },
  box: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderRadius: radii.card,
    minHeight: touch.desk + 4,
    justifyContent: "center",
  },
  boxStrong: { borderWidth: 1.5 },
  boxRow: { flexDirection: "row", alignItems: "center" },
  trailing: { paddingRight: space[1] },
  input: {
    ...typeScale.body,
    fontFamily: fonts.medium,
    color: palette.ink,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  multiline: { minHeight: 104, textAlignVertical: "top", paddingTop: space[3] },
  row: { flexDirection: "row", gap: space[1], alignItems: "flex-start" },
  flex: { flex: 1 },
});
