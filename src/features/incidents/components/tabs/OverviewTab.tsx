import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { Incident } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { languageLabel } from "@/lib/labels";
import { palette, space } from "@/lib/theme";
import { Card, Icon, Row, Section, Stack, Text, type IconName } from "@/components/ui";
import { InlineNotice } from "@/components/feedback";
import { SeverityBadge } from "@/components/domain";
import { AudioPlayerButton, isMediaExpired, MediaMessage, MediaPhoto } from "@/features/media";
import { labelFor } from "../../lib/custom-fields";

function fieldValue(value: unknown): string {
  return typeof value === "boolean" ? (value ? "Yes" : "No") : String(value ?? "—");
}

/** One bento tile: a small bordered card, icon + label on top, the value underneath. */
function FactTile({
  icon,
  label,
  children,
  testID,
}: {
  icon?: IconName | undefined;
  label: string;
  children: ReactNode;
  testID?: string | undefined;
}) {
  return (
    <View style={styles.tile}>
      <Card testID={testID}>
        <Stack gap={1}>
          <Row gap={1} align="center">
            {icon ? <Icon name={icon} size={14} color={palette.grey500} /> : null}
            <Text variant="caption" tone="muted">
              {label}
            </Text>
          </Row>
          {children}
        </Stack>
      </Card>
    </View>
  );
}

export interface OverviewTabProps {
  incident: Incident;
  onRefreshMedia: () => void;
}

/** Photo, voice note, transcript (labelled as AI), description, category, severity, extra details. */
export function OverviewTab({ incident, onRefreshMedia }: OverviewTabProps) {
  const extra = Object.entries(incident.customFields);
  const language = incident.transcriptLanguage
    ? (languageLabel[incident.transcriptLanguage] ?? incident.transcriptLanguage)
    : "—";
  return (
    <Stack gap={4} testID="tab-overview">
      <MediaPhoto
        media={incident.photo}
        createdAt={incident.createdAt}
        onRefresh={onRefreshMedia}
        label="Photo of the hazard"
      />
      {incident.audio ? (
        isMediaExpired(incident.createdAt) ? (
          <MediaMessage>Media expired (files are kept for 14 days)</MediaMessage>
        ) : (
          <AudioPlayerButton uri={incident.audio.url} />
        )
      ) : null}

      {incident.processing.transcription === "PENDING" ? (
        <InlineNotice message="Transcribing…" />
      ) : null}
      {incident.processing.transcription === "COMPLETED" ? (
        <Card tone="subtle" testID="transcript">
          <Row justify="space-between" gap={2}>
            <Text variant="label">Transcript</Text>
            <Text variant="caption" tone="muted">
              Machine transcription · {language}
            </Text>
          </Row>
          <Text>{incident.transcript ?? "No speech detected"}</Text>
        </Card>
      ) : null}

      <Section title="Details" icon="clip">
        <Stack gap={3}>
          {incident.description ? (
            <Card testID="description-tile">
              <Stack gap={1}>
                <Row gap={1} align="center">
                  <Icon name="list" size={14} color={palette.grey500} />
                  <Text variant="caption" tone="muted">
                    Description
                  </Text>
                </Row>
                <Text>{incident.description}</Text>
              </Stack>
            </Card>
          ) : null}
          <View style={styles.bento}>
            <FactTile icon="filter" label="Category" testID="fact-category">
              <Text variant="label">{incident.category ?? "—"}</Text>
            </FactTile>
            <FactTile label="Severity" testID="fact-severity">
              <SeverityBadge severity={incident.severity} />
            </FactTile>
            <FactTile icon="user" label="Reporter" testID="fact-reporter">
              <Text variant="label">{incident.reporter.fullName}</Text>
            </FactTile>
            <FactTile icon="calendar" label="Created" testID="fact-created">
              <Text variant="label">{formatDateTime(incident.createdAt)}</Text>
            </FactTile>
            <FactTile icon="history" label="Updated" testID="fact-updated">
              <Text variant="label">{formatDateTime(incident.updatedAt)}</Text>
            </FactTile>
            {extra.map(([key, value]) => (
              <FactTile key={key} label={labelFor(key)}>
                <Text variant="label">{fieldValue(value)}</Text>
              </FactTile>
            ))}
          </View>
        </Stack>
      </Section>
    </Stack>
  );
}

const styles = StyleSheet.create({
  // Bento grid: three tiles per row on wide screens, reflowing to two then one as space narrows.
  bento: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  tile: { flexGrow: 1, flexBasis: 140, minWidth: 110 },
});
