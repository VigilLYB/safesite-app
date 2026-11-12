import { useEffect, useState } from "react";
import { useRouter, type Href } from "expo-router";
import { formatCount } from "@/lib/format";
import { severityWeight } from "@/lib/labels";
import { LIMITS } from "@/lib/validation";
import {
  Button,
  Card,
  ChipGroup,
  Row,
  SelectField,
  Stack,
  Text,
  TextField,
  Toggle,
} from "@/components/ui";
import { EmptyState, ErrorState, MapSkeleton } from "@/components/feedback";
import {
  BlueprintMap,
  HeatLegend,
  useBlueprint,
  useBlueprints,
  type HeatMetric,
} from "@/features/blueprints";
import { useHeatmap } from "../hooks/useAnalytics";
import { clampCell } from "../lib/params";
import type { AnalyticsContentProps } from "./types";

const PRESETS = ["25", "50", "100", "200"] as const;

/** Risk heatmap (guide §4.9): a blueprint is required; areas are listed even with zero reports. */
export function HeatmapContent({ state, filters, update }: AnalyticsContentProps) {
  const router = useRouter();
  const list = useBlueprints();
  const blueprintId =
    state.blueprintId ?? list.data?.find((b) => b.isDefault)?.id ?? list.data?.[0]?.id;
  const plan = useBlueprint(blueprintId);
  const [selected, setSelected] = useState<string | null>(null);
  const [cellText, setCellText] = useState(String(state.cellSize));
  const [debounced, setDebounced] = useState(state.cellSize);
  const [metric, setMetric] = useState<HeatMetric>("score");
  const [showCounts, setShowCounts] = useState(false);

  // Debounce cell-size changes by 300 ms (guide §4.9).
  useEffect(() => {
    const value = Number(cellText);
    if (!Number.isFinite(value) || value < LIMITS.cellSize.min || value > LIMITS.cellSize.max)
      return;
    const timer = setTimeout(() => setDebounced(clampCell(value)), 300);
    return () => clearTimeout(timer);
  }, [cellText]);

  const heat = useHeatmap({ ...filters, blueprintId: undefined }, blueprintId, debounced);
  const cellInvalid =
    cellText !== "" &&
    (Number(cellText) < 10 || Number(cellText) > 500 || !Number.isFinite(Number(cellText)));

  const viewReports = (areaId: string) =>
    router.push(
      `/incidents?tab=all&blueprintId=${blueprintId}&areaId=${areaId}&from=${state.fromDay}&to=${state.toDay}${state.severity ? `&severity=${state.severity}` : ""}` as Href,
    );

  const areas = heat.data?.areas ?? [];
  return (
    <Stack gap={4} testID="heatmap-screen">
      {list.data && list.data.length > 1 ? (
        <SelectField
          label="Blueprint"
          value={blueprintId ?? null}
          options={list.data.map((b) => ({ value: b.id, label: b.name }))}
          onChange={(id) => update({ blueprintId: id })}
        />
      ) : null}
      <Stack gap={2}>
        <Text variant="label">Cell size (px)</Text>
        <ChipGroup
          label="Cell size"
          options={PRESETS.map((p) => ({ value: p, label: p }))}
          value={(PRESETS as readonly string[]).includes(cellText) ? cellText : "50"}
          onChange={(value) => {
            setCellText(value);
            setDebounced(Number(value));
            update({ cellSize: Number(value) });
          }}
        />
        <TextField
          label="Custom cell size"
          value={cellText}
          onChangeText={setCellText}
          keyboardType="numeric"
          helper="Whole pixels from 10 to 500."
          error={cellInvalid ? "Enter a whole number from 10 to 500." : undefined}
          testID="cell-size"
        />
      </Stack>
      <Stack gap={2}>
        <Text variant="label">Heat shows</Text>
        <ChipGroup
          label="Heat shows"
          options={[
            { value: "score", label: "Risk score" },
            { value: "count", label: "Report count" },
          ]}
          value={metric}
          onChange={setMetric}
        />
        <Toggle
          label="Show numbers on the map"
          value={showCounts}
          onChange={setShowCounts}
          testID="heat-numbers"
        />
      </Stack>
      {list.isError ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
      {list.data && list.data.length === 0 ? (
        <EmptyState icon="map" title="No blueprints yet" />
      ) : null}
      {(plan.isPending && blueprintId) || (heat.isPending && blueprintId) ? <MapSkeleton /> : null}
      {plan.isError ? <ErrorState error={plan.error} onRetry={() => void plan.refetch()} /> : null}
      {heat.isError && !heat.data ? (
        <ErrorState error={heat.error} onRetry={() => void heat.refetch()} />
      ) : null}
      {plan.data && heat.data ? (
        <Stack gap={4}>
          <BlueprintMap
            blueprint={plan.data}
            accessibilityLabel={`Incident heatmap of ${plan.data.name}. ${formatCount(heat.data.totals.reports)} pinned reports.`}
            areas={plan.data.areas.map((a) => ({ ...a, highlighted: a.id === selected }))}
            cells={heat.data.cells}
            cellSize={heat.data.cellSize}
            heatMetric={metric}
            showHeatCounts={showCounts}
            onImageError={() => void plan.refetch()}
          />
          {heat.data.cells.length === 0 ? (
            <EmptyState icon="map" title="No pinned reports in this period" />
          ) : null}
          <HeatLegend
            lowLabel="Few reports"
            highLabel={metric === "score" ? "Highest risk" : "Most reports"}
          />
          <Text variant="caption" tone="muted" testID="legend">
            Reports that are close together add up, so crowded spots get darker. Risk weights: Low{" "}
            {severityWeight.LOW}, Medium {severityWeight.MEDIUM}, High {severityWeight.HIGH},
            Critical {severityWeight.CRITICAL}.
          </Text>
          <Text variant="caption" tone="muted">
            {formatCount(heat.data.totals.reports)} pinned reports on this blueprint. Reports
            without a pin are not on the map.
          </Text>
          <Card testID="area-table">
            <Stack gap={3}>
              <Text variant="heading" accessibilityRole="header">
                Areas
              </Text>
              {areas.map((area) => (
                <Row key={area.areaId} justify="space-between" gap={2}>
                  <Button
                    label={area.name}
                    variant={selected === area.areaId ? "secondary" : "tertiary"}
                    size="desk"
                    onPress={() => setSelected(selected === area.areaId ? null : area.areaId)}
                    testID={`area-${area.areaId}`}
                  />
                  <Text variant="mono">
                    {formatCount(area.count)} · {formatCount(area.score)}
                  </Text>
                </Row>
              ))}
              {selected ? (
                <Button
                  label="View reports"
                  size="desk"
                  onPress={() => viewReports(selected)}
                  testID="view-area-reports"
                />
              ) : null}
            </Stack>
          </Card>
        </Stack>
      ) : null}
    </Stack>
  );
}
