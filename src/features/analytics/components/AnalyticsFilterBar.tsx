import { useState } from "react";
import type { Severity } from "@/lib/api";
import { clock } from "@/lib/clock";
import { shiftLabel } from "@/lib/labels";
import { lastDays, plantDay } from "@/lib/plant-time";
import {
  Button,
  Card,
  DateRangeField,
  describeRange,
  Grid,
  Row,
  SelectField,
  Stack,
  Text,
  Toggle,
} from "@/components/ui";
import { useBlueprints } from "@/features/blueprints";
import type { AnalyticsState, Shift } from "../lib/params";

const ANY = "ANY";
/** "Morning 06:00–14:00" -> name in the box, hours underneath in the list (fits a half-width field). */
const shiftOption = (value: Shift) => {
  const [name, hours] = shiftLabel[value].split(" ");
  return { value, label: name ?? shiftLabel[value], description: hours };
};
const SHIFT_OPTIONS = [
  { value: ANY, label: "All shifts" },
  shiftOption("A"),
  shiftOption("B"),
  shiftOption("C"),
];
const SEVERITY_OPTIONS = [
  { value: ANY, label: "Any" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
] as const;

export interface AnalyticsFilterBarProps {
  state: AnalyticsState;
  onChange: (patch: Partial<AnalyticsState>) => void;
  /** Overview only: the heatmap tab always has its own required blueprint selector. */
  showBlueprint?: boolean | undefined;
}

/**
 * Shared by every Analytics view and kept in the URL. A Filters button (with the current range
 * beside it) opens the panel: date range, shift, severity, active only and, on Overview,
 * blueprint. There is deliberately no area filter.
 */
export function AnalyticsFilterBar({ state, onChange, showBlueprint }: AnalyticsFilterBarProps) {
  const [open, setOpen] = useState(false);
  const blueprints = useBlueprints(Boolean(showBlueprint) && open);
  const def = lastDays(30);
  const customRange = state.fromDay !== def.fromDay || state.toDay !== def.toDay;
  const active = [
    customRange,
    state.shift,
    state.severity,
    state.activeOnly,
    showBlueprint && state.blueprintId,
  ].filter(Boolean).length;

  return (
    <Stack gap={3} testID="analytics-filters">
      <Row gap={3} wrap>
        <Button
          label={open ? "Hide filters" : active > 0 ? `Filters (${active})` : "Filters"}
          icon="filter"
          variant="secondary"
          size="desk"
          onPress={() => setOpen((value) => !value)}
          testID="toggle-analytics-filters"
        />
        <Text variant="caption" tone="muted">
          {customRange ? describeRange(state) : "Last 30 days"}
        </Text>
      </Row>
      {open ? (
        <Card tone="subtle" testID="analytics-filter-panel">
          <Stack gap={4}>
            <Stack gap={1}>
              <Text variant="label">Dates</Text>
              <DateRangeField
                label="Reports between"
                value={{ fromDay: state.fromDay, toDay: state.toDay }}
                today={plantDay(clock.now())}
                onChange={(range) =>
                  onChange({
                    fromDay: range.fromDay ?? def.fromDay,
                    toDay: range.toDay ?? def.toDay,
                  })
                }
                testID="an-dates"
              />
            </Stack>
            <Grid columns={2} gap={3}>
              <SelectField
                label="Shift"
                value={state.shift ?? ANY}
                options={SHIFT_OPTIONS}
                onChange={(value) =>
                  onChange({ shift: value === ANY ? undefined : (value as Shift) })
                }
                testID="an-shift"
              />
              <SelectField
                label="Severity"
                value={state.severity ?? ANY}
                options={SEVERITY_OPTIONS}
                onChange={(value) =>
                  onChange({ severity: value === ANY ? undefined : (value as Severity) })
                }
                testID="an-severity"
              />
            </Grid>
            <Toggle
              label="Active only"
              helper="Only reports that are not yet resolved, closed or rejected."
              value={Boolean(state.activeOnly)}
              onChange={(value) => onChange({ activeOnly: value || undefined })}
              testID="an-active"
            />
            {showBlueprint && blueprints.data && blueprints.data.length > 0 ? (
              <SelectField
                label="Blueprint"
                value={state.blueprintId ?? ANY}
                options={[
                  { value: ANY, label: "All blueprints" },
                  ...blueprints.data.map((b) => ({ value: b.id, label: b.name })),
                ]}
                onChange={(id) => onChange({ blueprintId: id === ANY ? undefined : id })}
              />
            ) : null}
          </Stack>
        </Card>
      ) : null}
    </Stack>
  );
}
