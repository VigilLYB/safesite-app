import { useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { useFocusRing } from "@/lib/use-focus-ring";
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
  testID,
  ...input
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const { handlers, ringStyle } = useFocusRing();
  const borderColor = error ? palette.ink : focused ? palette.ink : palette.grey300;

  return (
    <View style={styles.field}>
      <Text variant="label">
        {label}
        {required ? " *" : ""}
      </Text>
      <View style={[styles.box, { borderColor }, (focused || error) && styles.boxStrong]}>
        <TextInput
          {...input}
          multiline={multiline}
          testID={testID}
          accessibilityLabel={label}
          accessibilityHint={helper}
          aria-invalid={Boolean(error)}
          placeholderTextColor={palette.grey500}
          onFocus={() => {
            setFocused(true);
            handlers.onFocus();
          }}
          onBlur={() => {
            setFocused(false);
            handlers.onBlur();
          }}
          style={[styles.input, multiline && styles.multiline, ringStyle]}
        />
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
