import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { Severity } from "@/lib/api";
import { useBreakpoint } from "@/lib/responsive";
import { space } from "@/lib/theme";
import {
  Button,
  Card,
  ChipGroup,
  MasterDetail,
  Screen,
  ScreenHeader,
  Stack,
  Text,
} from "@/components/ui";
import { EmptyState } from "@/components/feedback";
import { useRoleRoutes } from "@/features/auth";
import { IncidentList, VersionSnapshotView, VersionTimeline } from "@/features/incidents";

type SeverityScope = "ALL" | Severity;

const OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
] as const;

function AuditDetail({ id }: { id: string }) {
  const routes = useRoleRoutes();
  const [version, setVersion] = useState<number | null>(null);
  return (
    <Stack gap={4}>
      <Card>
        <Stack gap={3}>
          <Text variant="label">Audit history (immutable)</Text>
          <VersionTimeline incidentId={id} selectedVersion={version} onSelect={setVersion} />
        </Stack>
      </Card>
      <VersionSnapshotView incidentId={id} version={version} />
      <Button
        label="Open full report"
        variant="secondary"
        size="desk"
        onPress={() => routes.openIncident(id)}
      />
    </Stack>
  );
}

/** Every report with its full version history: who changed what, and when. */
export function AuditScreen() {
  const routes = useRoleRoutes();
  const { isTablet } = useBreakpoint();
  const [scope, setScope] = useState<SeverityScope>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = (
    <IncidentList
      filters={{ severity: scope === "ALL" ? undefined : scope, limit: 25 }}
      selectedId={selectedId}
      onSelect={(incident) =>
        isTablet ? setSelectedId(incident.id) : routes.openIncident(incident.id)
      }
      header={
        <View style={styles.header}>
          <ScreenHeader title="Audit history" subtitle="Every change, with who and when" />
          <ChipGroup label="Severity" options={OPTIONS} value={scope} onChange={setScope} />
        </View>
      }
    />
  );

  return (
    <Screen scroll={false}>
      <MasterDetail
        list={list}
        detail={
          selectedId ? (
            <ScrollView key={selectedId} contentContainerStyle={styles.detail}>
              <AuditDetail id={selectedId} />
            </ScrollView>
          ) : (
            <EmptyState
              icon="history"
              title="Select a report"
              message="Choose one to see its history."
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space[3] },
  detail: { paddingBottom: space[6] },
});
