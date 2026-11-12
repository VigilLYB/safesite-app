import type { Incident } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { languageLabel, locationSourceLabel } from "@/lib/labels";
import { Button, Card, KeyValue, Row, Stack, Text } from "@/components/ui";
import { InlineNotice } from "@/components/feedback";
import { SeverityBadge } from "@/components/domain";
import { AudioPlayerButton, isMediaExpired, MediaMessage, MediaPhoto } from "@/features/media";
import { labelFor } from "../../lib/custom-fields";

export interface OverviewTabProps {
  incident: Incident;
  onRefreshMedia: () => void;
  onOpenLocation: () => void;
}

/** Photo, voice note, transcript (labelled as AI), description, category, severity, extra details. */
export function OverviewTab({ incident, onRefreshMedia, onOpenLocation }: OverviewTabProps) {
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

      {incident.description ? (
        <Stack gap={1}>
          <Text variant="label">Description</Text>
          <Text>{incident.description}</Text>
        </Stack>
      ) : null}
      <Row gap={5} wrap>
        <KeyValue label="Category" value={incident.category ?? "—"} />
        <Stack gap={1}>
          <Text variant="caption" tone="muted">
            Severity
          </Text>
          <SeverityBadge severity={incident.severity} />
        </Stack>
        <KeyValue label="Reporter" value={incident.reporter.fullName} />
        <KeyValue label="Created" value={formatDateTime(incident.createdAt)} />
        <KeyValue label="Updated" value={formatDateTime(incident.updatedAt)} />
      </Row>
      {extra.length > 0 ? (
        <Stack gap={1}>
          <Text variant="label">Extra details</Text>
          {extra.map(([key, value]) => (
            <Text key={key} variant="caption">
              {labelFor(key)}:{" "}
              {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value ?? "—")}
            </Text>
          ))}
        </Stack>
      ) : null}
      <Stack gap={1}>
        <Text variant="label">Location</Text>
        <Text variant="caption" tone="muted">
          {incident.location.areaName ?? "No area"} ·{" "}
          {locationSourceLabel[incident.location.source]}
        </Text>
        <Button
          label="View on the floor plan"
          variant="tertiary"
          size="desk"
          icon="map"
          onPress={onOpenLocation}
        />
      </Stack>
    </Stack>
  );
}
