import { StyleSheet, View } from "react-native";
import { Text } from "../Text";

export interface KeyValueProps {
  label: string;
  value: string;
  mono?: boolean | undefined;
}

export function KeyValue({ label, value, mono = false }: KeyValueProps) {
  return (
    <View style={styles.item} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant={mono ? "mono" : "label"}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ item: { gap: 2, minWidth: 96 } });
