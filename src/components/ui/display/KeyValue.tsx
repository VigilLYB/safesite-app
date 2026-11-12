import { StyleSheet, View } from "react-native";
import { palette, space } from "@/lib/theme";
import { Icon, type IconName } from "../icons";
import { Text } from "../Text";

export interface KeyValueProps {
  label: string;
  value: string;
  mono?: boolean | undefined;
  icon?: IconName | undefined;
}

export function KeyValue({ label, value, mono = false, icon }: KeyValueProps) {
  return (
    <View style={styles.item} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.labelRow}>
        {icon ? <Icon name={icon} size={14} color={palette.grey500} /> : null}
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      </View>
      <Text variant={mono ? "mono" : "label"}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { gap: 2, minWidth: 96 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: space[1] },
});
