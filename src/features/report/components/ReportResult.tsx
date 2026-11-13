import { useRouter, type Href } from "expo-router";
import type { SubmitIncidentResponse } from "@/lib/api";
import { formatDateTime, formatSimilarity, shortId } from "@/lib/format";
import { languageLabel } from "@/lib/labels";
import { Badge, Button, Card, Row, Stack, Text } from "@/components/ui";
import { Banner, MutationError } from "@/components/feedback";
import { SeverityBadge } from "@/components/domain";
import { useAutoPpeScan, useIncident, useRetryTranscription } from "@/features/incidents";

export interface ReportResultProps {
  result: SubmitIncidentResponse;
  onAnother: () => void;
  onDone: () => void;
}

/** What the server did with the report: transcript, duplicate match, estimated pin, PPE. */
export function ReportResult({ result, onAnother, onDone }: ReportResultProps) {
  const router = useRouter();
  const live = useIncident(result.incident.id);
  const incident = live.data ?? result.incident;
  const retry = useRetryTranscription();
  const ppe = useAutoPpeScan(incident);
  const ai = result.ai;
  const open = (path: string) => router.push(path as Href);
  const transcription = ai?.transcription;

  return (
    <Stack gap={4} testID="report-result">
      <Banner
        icon="check"
        message={result.replayed ? "This report was already saved." : "Report sent."}
        testID="report-sent"
      />
      <Card>
        <Row justify="space-between">
          <Text variant="mono" tone="muted" testID="report-ref">
            {shortId(incident.id)}
          </Text>
          <Badge label="Open" />
        </Row>
        <Row gap={2} wrap>
          <SeverityBadge severity={incident.severity} />
          <Text variant="caption" tone="muted">
            {formatDateTime(incident.createdAt)}
          </Text>
        </Row>
      </Card>

      {ai ? (
        <>
          {transcription?.status === "COMPLETED" ? (
            <Card tone="subtle" testID="result-transcript">
              <Text variant="label">Transcript · Machine transcription</Text>
              <Text>{incident.transcript ?? "No speech detected"}</Text>
              {incident.transcriptLanguage ? (
                <Text variant="caption" tone="muted">
                  {languageLabel[incident.transcriptLanguage] ?? incident.transcriptLanguage}
                </Text>
              ) : null}
            </Card>
          ) : null}
          {transcription?.status === "FAILED" ? (
            <Card tone="subtle" testID="result-transcript-failed">
              <Text>{transcription.error ?? "The voice note could not be transcribed."}</Text>
              <Button
                label="Retry transcription"
                variant="secondary"
                size="desk"
                loading={retry.isPending}
                onPress={() => retry.mutate(incident.id)}
              />
              <MutationError error={retry.error} />
            </Card>
          ) : null}
          {ai.clusteredUnder ? (
            <Card tone="subtle" testID="result-duplicate">
              <Text>
                Linked to an existing report ({formatSimilarity(ai.clusteredUnder.similarity)}{" "}
                similar, AI match). Your report is part of its thread.
              </Text>
              <Button
                label="View that report"
                variant="secondary"
                size="desk"
                onPress={() => open(`/incidents/${ai.clusteredUnder?.incidentId}`)}
              />
            </Card>
          ) : null}
          {ai.isMock ? <Badge label="Simulated AI result" /> : null}
        </>
      ) : null}

      <Card testID="result-location">
        <Text variant="label">Location</Text>
        {incident.location.source === "GPS_ESTIMATE" ? (
          <>
            <Text>Pin estimated in {incident.location.areaName ?? "an unmapped area"}</Text>
            <Button
              label="Adjust pin"
              variant="secondary"
              size="desk"
              icon="pin"
              onPress={() => open(`/incidents/${incident.id}?tab=location`)}
            />
          </>
        ) : incident.location.source === "NONE" ? (
          <>
            <Text>No location yet</Text>
            {incident.permissions.canEdit ? (
              <Button
                label="Add a pin"
                variant="secondary"
                size="desk"
                icon="pin"
                onPress={() => open(`/incidents/${incident.id}?tab=location`)}
              />
            ) : null}
          </>
        ) : (
          <Text>{incident.location.areaName ?? "Placed by hand"}</Text>
        )}
      </Card>

      {incident.photo && incident.permissions.canRunPpeScan ? (
        <Card>
          <Text variant="caption" tone="muted">
            {ppe.running ? "Checking the photo for PPE…" : "PPE is checked automatically."}
          </Text>
          <Button
            label="View PPE check"
            variant="secondary"
            size="desk"
            icon="shield"
            loading={ppe.running}
            onPress={() => open(`/incidents/${incident.id}?tab=ppe`)}
            testID="result-ppe"
          />
          <MutationError error={ppe.error} />
        </Card>
      ) : null}

      <Row gap={2} wrap>
        <Button
          label="View report"
          onPress={() => open(`/incidents/${incident.id}`)}
          testID="view-report"
        />
        <Button
          label="Report another"
          variant="secondary"
          onPress={onAnother}
          testID="report-another"
        />
        <Button label="Done" variant="tertiary" onPress={onDone} testID="report-done" />
      </Row>
    </Stack>
  );
}
