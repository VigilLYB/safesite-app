import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { isApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { actorRoleLabel } from "@/lib/labels";
import { isPositiveInt, isUuid } from "@/lib/validation";
import { Banner, DetailSkeleton, ErrorState, RecordNotFound } from "@/components/feedback";
import { Button, Row, Screen, ScreenHeader, Stack, Text } from "@/components/ui";
import { useIncidentTimeline, useIncidentVersion } from "../hooks/useIncidents";
import { TimelineBar } from "./TimelineBar";
import { VersionSnapshot } from "./VersionSnapshot";

/** Past version (guide §4.5): read-only, no edit / workflow / pin controls. */
export function IncidentVersionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; version: string }>();
  const incidentId = String(params.id);
  const versionText = String(params.version);
  const valid = isUuid(incidentId) && isPositiveInt(versionText);
  const version = valid ? Number(versionText) : null;
  const snapshot = useIncidentVersion(incidentId, version);
  const timeline = useIncidentTimeline(incidentId, valid);

  const current = `/incidents/${incidentId}` as Href;
  const nodes = timeline.data?.nodes ?? [];
  const node = nodes.find((n) => n.version === version);
  const last = nodes[nodes.length - 1]?.version;
  const go = (n: number) => router.replace(`/incidents/${incidentId}/versions/${n}` as Href);

  const missing =
    snapshot.isError &&
    isApiError(snapshot.error) &&
    (snapshot.error.status === 422 || snapshot.error.kind === "notFound");

  return (
    <Screen testID="incident-version">
      <ScreenHeader
        title={version ? `Version ${version}` : "Version"}
        onBack={() => (router.canGoBack() ? router.back() : router.replace(current))}
      />
      {!valid ? <RecordNotFound what="version" /> : null}
      {valid && snapshot.isPending ? <DetailSkeleton lines={4} /> : null}
      {missing ? (
        <Stack gap={3}>
          <RecordNotFound what="version" />
          <Button
            label="Back to current version"
            onPress={() => router.replace(current)}
            size="desk"
          />
        </Stack>
      ) : null}
      {snapshot.isError && !missing ? (
        <ErrorState error={snapshot.error} onRetry={() => void snapshot.refetch()} />
      ) : null}
      {snapshot.data ? (
        <Stack gap={4}>
          <Banner
            icon="history"
            message={`Version ${snapshot.data.version}${last ? ` of ${last}` : ""}: ${snapshot.data.label} by ${
              snapshot.data.actor.role === "SYSTEM"
                ? actorRoleLabel.SYSTEM
                : snapshot.data.actor.fullName
            }, ${formatDateTime(snapshot.data.createdAt)}. Read-only.`}
            testID="version-banner"
          />
          {snapshot.data.note ? (
            <Text>
              {snapshot.data.nodeType === "REJECTED" || snapshot.data.nodeType === "REOPENED"
                ? "Reason: "
                : "Note: "}
              {snapshot.data.note}
            </Text>
          ) : null}
          {nodes.length > 0 ? (
            <TimelineBar
              nodes={nodes}
              currentVersion={last ?? snapshot.data.version}
              selectedVersion={snapshot.data.version}
              onSelect={go}
            />
          ) : null}
          <VersionSnapshot version={snapshot.data} changedFields={node?.changedFields ?? []} />
          <Row gap={2} wrap>
            <Button
              label="Previous version"
              variant="secondary"
              size="desk"
              disabled={snapshot.data.version <= 1}
              onPress={() => go(snapshot.data.version - 1)}
              testID="prev-version"
            />
            <Button
              label="Next version"
              variant="secondary"
              size="desk"
              disabled={last === undefined || snapshot.data.version >= last}
              onPress={() => go(snapshot.data.version + 1)}
              testID="next-version"
            />
            <Button
              label="Back to current version"
              variant="tertiary"
              size="desk"
              onPress={() => router.replace(current)}
            />
          </Row>
        </Stack>
      ) : null}
    </Screen>
  );
}
