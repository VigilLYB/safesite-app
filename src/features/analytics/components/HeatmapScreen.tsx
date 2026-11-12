import { useState } from "react";
import { Screen, ScreenHeader, SelectField, Stack } from "@/components/ui";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/feedback";
import { useBlueprints } from "@/features/blueprints";
import { useAnalyticsControls } from "../hooks/useAnalytics";
import { AnalyticsFilterBar } from "./AnalyticsFilterBar";
import { HeatmapView } from "./HeatmapView";

export function HeatmapScreen() {
  const controls = useAnalyticsControls();
  const blueprints = useBlueprints();
  const [chosen, setChosen] = useState<string | null>(null);

  const items = blueprints.data ?? [];
  const blueprintId = chosen ?? items.find((item) => item.isDefault)?.id ?? items[0]?.id;

  return (
    <Screen onRefresh={() => void blueprints.refetch()} refreshing={blueprints.isRefetching}>
      <ScreenHeader
        eyebrow="Plant X"
        title="Risk heatmap"
        subtitle="Where incidents cluster on the floor plan"
      />
      <AnalyticsFilterBar controls={controls} />
      {blueprints.isPending ? <ListSkeleton rows={2} /> : null}
      {blueprints.isError ? (
        <ErrorState error={blueprints.error} onRetry={() => void blueprints.refetch()} />
      ) : null}
      {blueprints.data && items.length === 0 ? (
        <EmptyState
          icon="map"
          title="No floor plan yet"
          message="Register a facility blueprint to see the heatmap."
        />
      ) : null}
      {blueprintId ? (
        <Stack gap={4}>
          {items.length > 1 ? (
            <SelectField
              label="Floor plan"
              value={blueprintId}
              options={items.map((item) => ({ value: item.id, label: item.name }))}
              onChange={setChosen}
            />
          ) : null}
          <HeatmapView blueprintId={blueprintId} filters={controls.filters} />
        </Stack>
      ) : null}
    </Screen>
  );
}
