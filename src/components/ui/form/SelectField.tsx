import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useFocusRing } from "@/lib/use-focus-ring";
import { palette, radii, space, touch } from "@/lib/theme";
import { Icon } from "../icons";
import { BottomSheet } from "../overlay";
import { Text } from "../Text";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  description?: string | undefined;
}

export interface SelectFieldProps<T extends string> {
  label: string;
  value: T | null;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string | undefined;
  helper?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  testID?: string | undefined;
}

/** On phones the option list is a large-target bottom sheet, not a tiny native menu. */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = "Choose",
  helper,
  error,
  required,
  testID,
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const { handlers, ringStyle } = useFocusRing();
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.field}>
      <Text variant="label">
        {label}
        {required ? " *" : ""}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        accessibilityHint="Opens a list of options"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        testID={testID}
        {...handlers}
        style={({ pressed }) => [
          styles.box,
          { borderColor: error ? palette.ink : palette.grey300 },
          pressed && { backgroundColor: palette.grey50 },
          ringStyle as ViewStyle,
        ]}
      >
        <Text variant="body" tone={selected ? "default" : "muted"} style={styles.flex}>
          {selected?.label ?? placeholder}
        </Text>
        <Icon name="down" size={18} color={palette.ink2} />
      </Pressable>
      {error ? (
        <View style={styles.row} accessible accessibilityRole="alert">
          <Icon name="warn" size={16} />
          <Text variant="caption">{error}</Text>
        </View>
      ) : helper ? (
        <Text variant="caption" tone="muted">
          {helper}
        </Text>
      ) : null}
      <BottomSheet visible={open} title={label} onClose={() => setOpen(false)}>
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={({ pressed }) => [
                styles.option,
                (isSelected || pressed) && styles.optionSelected,
              ]}
            >
              <View style={[styles.radio, isSelected && styles.radioOn]}>
                {isSelected ? <View style={styles.radioDot} /> : null}
              </View>
              <View style={styles.flex}>
                <Text variant="body">{option.label}</Text>
                {option.description ? (
                  <Text variant="caption" tone="muted">
                    {option.description}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[1] },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    minHeight: touch.desk + 4,
    paddingHorizontal: space[3],
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderRadius: radii.card,
  },
  row: { flexDirection: "row", gap: space[1], alignItems: "center" },
  flex: { flex: 1 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    minHeight: touch.desk + 4,
    paddingHorizontal: space[3],
    borderRadius: radii.control,
  },
  optionSelected: { backgroundColor: palette.grey50 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: palette.fieldBar,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: palette.ink },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.ink },
});
