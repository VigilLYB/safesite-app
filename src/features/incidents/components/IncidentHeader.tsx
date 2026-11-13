import { useRouter, type Href } from "expo-router";
import type { Incident } from "@/lib/api";
import { formatDateTime, formatSimilarity, shortId } from "@/lib/format";
import { canRetryTranscription } from "@/lib/permissions";
import { Banner } from "@/components/feedback";
import { Card, Row, Stack, Text } from "@/components/ui";
import { SeverityBadge, StatusPill } from "@/components/domain";
import { useSession } from "@/features/auth";

export interface IncidentHeaderProps {
  incident: Incident;
  parentTitle: string | null | undefined;
  onRetryTranscription: () => void;
  retrying: boolean;
}

/** Saved on the device more than 5 minutes before the server got it: worth saying when it was seen. */
const SENT_LATER_MS = 5 * 60_000;
export function sentLater(capturedAt: string | null | undefined, createdAt: string): boolean {
  if (!capturedAt) return false;
  const gap = new Date(createdAt).getTime() - new Date(capturedAt).getTime();
  return Number.isFinite(gap) && gap > SENT_LATER_MS;
}

/** Title, reference, status, severity, reporter, times, and the banners that explain the state. */
export function IncidentHeader({
  incident,
  parentTitle,
  onRetryTranscription,
  retrying,
}: IncidentHeaderProps) {
  const router = useRouter();
  const { user } = useSession();
  const parentId = incident.cluster.parentIncidentId;
  const viewingParent = user?.role === "WORKER" && incident.reporter.id !== user.id;

  return (
    <Stack gap={3}>
      <Card>
        <Stack gap={2}>
          <Row gap={2} wrap align="center">
            <StatusPill status={incident.status} />
            <SeverityBadge severity={incident.severity} />
            <Text variant="mono" tone="muted">
              #{shortId(incident.id)}
            </Text>
          </Row>
          <Text variant="caption" tone="muted">
            Reported by {incident.reporter.fullName} · {formatDateTime(incident.createdAt)} · Last
            change: {incident.lastChange.label}, {formatDateTime(incident.lastChange.at)}
          </Text>
          {sentLater(incident.capturedAt, incident.createdAt) ? (
            <Text variant="caption" tone="muted" testID="seen-at">
              Seen {formatDateTime(incident.capturedAt)}: saved offline and sent later
            </Text>
          ) : null}
        </Stack>
      </Card>

      {incident.cluster.isDuplicate && parentId ? (
        <Banner
          icon="link"
          message={`Duplicate of ${parentTitle ?? "an existing report"}. ${formatSimilarity(incident.cluster.similarity)} similar.`}
          actionLabel="Open parent"
          onAction={() => router.push(`/incidents/${parentId}` as Href)}
          testID="duplicate-banner"
        />
      ) : null}
      {viewingParent ? (
        <Banner
          icon="shield"
          message="You can see this report because yours was linked to it."
          testID="parent-banner"
        />
      ) : null}
      {incident.processing.transcription === "FAILED" ? (
        <Banner
          icon="warn"
          message={incident.processing.error ?? "The voice note could not be transcribed."}
          actionLabel={
            canRetryTranscription(user, incident)
              ? retrying
                ? "Retrying…"
                : "Retry transcription"
              : undefined
          }
          onAction={canRetryTranscription(user, incident) ? onRetryTranscription : undefined}
          testID="transcription-failed"
        />
      ) : null}
    </Stack>
  );
}
