import { View } from "react-native";
import type { SubmitIncidentResponse } from "@/lib/api";
import { formatPercent, shortId } from "@/lib/format";
import { palette, radii, severityTokens, space } from "@/lib/theme";
import { Button, Card, Icon, Stack, Text } from "@/components/ui";
import { SeverityBadge } from "@/components/domain";

export interface SubmittedViewProps {
  result: SubmitIncidentResponse;
  onDone: () => void;
  onAnother: () => void;
}

export function SubmittedView({ result, onDone, onAnother }: SubmittedViewProps) {
  const { incident, replayed, ai } = result;
  const matched = ai?.clusteredUnder;
  return (
    <Stack gap={4}>
      <View style={{ alignItems: "center", gap: space[3], paddingVertical: space[4] }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: radii.sheet,
            backgroundColor: palette.ink,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="check" size={48} color={palette.onInk} />
        </View>
        <Text variant="title" accessibilityRole="header">
          Report sent
        </Text>
        <Text tone="muted" style={{ textAlign: "center" }}>
          {replayed
            ? "We already had this report, so nothing was duplicated."
            : "Your supervisor has been notified."}
        </Text>
      </View>
      <Card edgeColor={severityTokens[incident.severity].fill}>
        <Stack gap={2}>
          <Text variant="mono" tone="muted">
            {shortId(incident.id)}
          </Text>
          <Text variant="heading">{incident.title?.trim() || "Untitled report"}</Text>
          <SeverityBadge severity={incident.severity} />
          {matched ? (
            <Text variant="caption" tone="muted">
              It looks like a report already open ({formatPercent(matched.similarity)} similar).
              Your supervisor will group them.
            </Text>
          ) : null}
          {ai?.isMock ? (
            <Text variant="caption" tone="muted">
              Voice transcription is running in demo mode.
            </Text>
          ) : null}
        </Stack>
      </Card>
      <Button label="Done" fullWidth onPress={onDone} testID="report-done" />
      <Button label="Report another" variant="secondary" fullWidth onPress={onAnother} />
    </Stack>
  );
}
