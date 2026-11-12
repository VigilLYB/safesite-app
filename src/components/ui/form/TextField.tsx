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
 * Borderless: a tonal fill plus a 3pt bottom bar marks the field edge (>= 3:1).
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
  const barColor = error ? palette.ink : focused ? palette.focus : palette.fieldBar;

  return (
    <View style={styles.field}>
      <Text variant="label">
        {label}
        {required ? " *" : ""}
      </Text>
      <View style={[styles.box, { borderBottomColor: barColor }, error ? styles.errorFill : null]}>
        <TextInput
          {...input}
          multiline={multiline}
          testID={testID}
          accessibilityLabel={label}
          accessibilityHint={helper}
          aria-invalid={Boolean(error)}
          placeholderTextColor={palette.ink2}
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
    backgroundColor: palette.grey100,
    borderBottomWidth: 3,
    borderTopLeftRadius: radii.control,
    borderTopRightRadius: radii.control,
    minHeight: touch.worker,
    justifyContent: "center",
  },
  errorFill: { backgroundColor: palette.grey200 },
  input: {
    ...typeScale.bodyLg,
    fontFamily: fonts.medium,
    color: palette.ink,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  multiline: { minHeight: 120, textAlignVertical: "top", paddingTop: space[3] },
  row: { flexDirection: "row", gap: space[1], alignItems: "flex-start" },
  flex: { flex: 1 },
});
