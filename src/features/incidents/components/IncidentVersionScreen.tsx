import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { incidentKeys, incidentsApi, isApiError } from "@/lib/api";
import { displayTitle, formatDateTime } from "@/lib/format";
import { isStaff } from "@/lib/permissions";
import { actorRoleLabel } from "@/lib/labels";
import { isPositiveInt, isUuid } from "@/lib/validation";
import { Banner, DetailSkeleton, ErrorState, RecordNotFound } from "@/components/feedback";
import { Button, Row, Screen, ScreenHeader, Stack, Text } from "@/components/ui";
import { useSession } from "@/features/auth";
import { useIncident, useIncidentTimeline, useIncidentVersion } from "../hooks/useIncidents";
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
  const head = useIncident(valid ? incidentId : "none");
  const { user } = useSession();

  const current = `/incidents/${incidentId}` as Href;
  const nodes = timeline.data?.nodes ?? [];
  const last = nodes[nodes.length - 1]?.version;
  const queryClient = useQueryClient();
  // Same screen, new param: only the panel under the title changes; nothing remounts.
  const go = (n: number) => {
    if (n !== version) router.setParams({ version: String(n) });
  };
  const switching = snapshot.isPlaceholderData;

  // Warm the neighbours so Previous / Next switch instantly.
  useEffect(() => {
    if (!valid || version === null) return;
    for (const n of [version - 1, version + 1]) {
      if (n < 1 || (last !== undefined && n > last)) continue;
      void queryClient.prefetchQuery({
        queryKey: incidentKeys.version(incidentId, n),
        queryFn: ({ signal }) => incidentsApi.version(incidentId, n, signal),
        staleTime: 50 * 60_000,
      });
    }
  }, [queryClient, incidentId, valid, version, last]);

  const missing =
    snapshot.isError &&
    isApiError(snapshot.error) &&
    (snapshot.error.status === 422 || snapshot.error.kind === "notFound");

  return (
    <Screen testID="incident-version">
      <ScreenHeader
        title={version ? `v${version}` : "Version"}
        onBack={() => (router.canGoBack() ? router.back() : router.replace(current))}
        trail={[
          {
            label: isStaff(user?.role) ? "Incidents" : "My reports",
            onPress: () => router.replace("/incidents" as Href),
          },
          {
            label: head.data ? displayTitle(head.data) : "Report",
            onPress: () => router.replace(current),
          },
        ]}
      />
      {!valid ? <RecordNotFound what="version" /> : null}
      {valid && snapshot.isPending && !snapshot.data ? <DetailSkeleton lines={4} /> : null}
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
      {snapshot.isError && !missing && !snapshot.data ? (
        <ErrorState error={snapshot.error} onRetry={() => void snapshot.refetch()} />
      ) : null}
      {snapshot.data && !missing ? (
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
              selectedVersion={version ?? snapshot.data.version}
              onSelect={go}
            />
          ) : null}
          <View
            style={switching && styles.switching}
            aria-busy={switching}
            accessibilityState={{ busy: switching }}
          >
            <VersionSnapshot
              version={snapshot.data}
              changedFields={
                nodes.find((n) => n.version === snapshot.data.version)?.changedFields ?? []
              }
            />
          </View>
          <Row gap={2} wrap>
            <Button
              label="Previous version"
              variant="secondary"
              size="desk"
              disabled={version === null || version <= 1}
              onPress={() => version !== null && go(version - 1)}
              testID="prev-version"
            />
            <Button
              label="Next version"
              variant="secondary"
              size="desk"
              disabled={version === null || last === undefined || version >= last}
              onPress={() => version !== null && go(version + 1)}
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

const styles = StyleSheet.create({
  // A quiet hint while the next version loads; the previous one stays in place.
  switching: { opacity: 0.6 },
});
