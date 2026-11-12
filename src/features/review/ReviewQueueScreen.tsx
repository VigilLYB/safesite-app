import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useBreakpoint } from "@/lib/responsive";
import { space } from "@/lib/theme";
import { ChipGroup, MasterDetail, Screen, ScreenHeader } from "@/components/ui";
import { EmptyState } from "@/components/feedback";
import { FINISHED, IN_PROGRESS, NEEDS_REVIEW } from "@/components/domain";
import { useRoleRoutes } from "@/features/auth";
import { IncidentDetail, IncidentList } from "@/features/incidents";

type Queue = "review" | "progress" | "finished" | "all";

const OPTIONS = [
  { value: "review", label: "Needs review" },
  { value: "progress", label: "In progress" },
  { value: "finished", label: "Finished" },
  { value: "all", label: "All" },
] as const;

const STATUS: Record<Queue, string | undefined> = {
  review: NEEDS_REVIEW,
  progress: IN_PROGRESS,
  finished: FINISHED,
  all: undefined,
};

/** Triage on the left, decide on the right. Phones open the report as its own screen. */
export function ReviewQueueScreen() {
  const routes = useRoleRoutes();
  const { isTablet } = useBreakpoint();
  const [queue, setQueue] = useState<Queue>("review");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = (
    <IncidentList
      filters={{ status: STATUS[queue], rootsOnly: true, limit: 25 }}
      selectedId={selectedId}
      onSelect={(incident) =>
        isTablet ? setSelectedId(incident.id) : routes.openIncident(incident.id)
      }
      emptyTitle="Queue is clear"
      emptyMessage="No reports match this view."
      header={
        <View style={styles.header}>
          <ScreenHeader title="Review queue" subtitle="Validate, approve and assign" />
          <ChipGroup
            label="Queue"
            options={OPTIONS}
            value={queue}
            onChange={(next) => {
              setQueue(next);
              setSelectedId(null);
            }}
          />
        </View>
      }
    />
  );

  const detail = selectedId ? (
    <ScrollView key={selectedId} contentContainerStyle={styles.detail}>
      <IncidentDetail id={selectedId} />
    </ScrollView>
  ) : (
    <EmptyState
      icon="clip"
      title="Select a report"
      message="Choose one from the queue to review it."
    />
  );

  return (
    <Screen scroll={false}>
      <MasterDetail list={list} detail={detail} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space[3] },
  detail: { paddingBottom: space[6] },
});
