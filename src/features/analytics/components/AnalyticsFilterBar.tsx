import { useState } from "react";
import type { Severity } from "@/lib/api";
import { shiftLabel } from "@/lib/labels";
import { YMD } from "@/lib/plant-time";
import { Card, ChipGroup, SelectField, Stack, Text, TextField, Toggle } from "@/components/ui";
import { useBlueprints } from "@/features/blueprints";
import type { AnalyticsState, Shift } from "../lib/params";

const ANY = "ANY";

export interface AnalyticsFilterBarProps {
  state: AnalyticsState;
  onChange: (patch: Partial<AnalyticsState>) => void;
  /** Overview only: the heatmap tab always has its own required blueprint selector. */
  showBlueprint?: boolean | undefined;
}

function DayField({
  label,
  value,
  onApply,
  testID,
}: {
  label: string;
  value: string;
  onApply: (day: string) => void;
  testID: string;
}) {
  const [text, setText] = useState(value);
  const bad = text !== "" && !(YMD.test(text) && !Number.isNaN(Date.parse(text)));
  return (
    <TextField
      label={label}
      value={text}
      placeholder="YYYY-MM-DD"
      maxLength={10}
      error={bad ? "Use the format YYYY-MM-DD." : undefined}
      onChangeText={(next) => {
        setText(next);
        if (YMD.test(next) && !Number.isNaN(Date.parse(next))) onApply(next);
      }}
      testID={testID}
    />
  );
}

/** Shared by Overview and Heatmap and kept in the URL. There is deliberately no area filter. */
export function AnalyticsFilterBar({ state, onChange, showBlueprint }: AnalyticsFilterBarProps) {
  const blueprints = useBlueprints(Boolean(showBlueprint));
  const backwards = state.fromDay > state.toDay;
  return (
    <Card tone="subtle" testID="analytics-filters">
      <Stack gap={4}>
        <DayField
          label="From (plant time)"
          value={state.fromDay}
          onApply={(fromDay) => onChange({ fromDay })}
          testID="an-from"
        />
        <DayField
          label="To (plant time)"
          value={state.toDay}
          onApply={(toDay) => onChange({ toDay })}
          testID="an-to"
        />
        {backwards ? <Text variant="caption">The start must be before the end.</Text> : null}
        <Stack gap={2}>
          <Text variant="label">Shift</Text>
          <ChipGroup
            label="Shift"
            value={state.shift ?? ANY}
            onChange={(value) => onChange({ shift: value === ANY ? undefined : (value as Shift) })}
            options={[
              { value: ANY, label: "All shifts" },
              { value: "A", label: shiftLabel.A },
              { value: "B", label: shiftLabel.B },
              { value: "C", label: shiftLabel.C },
            ]}
          />
        </Stack>
        <Stack gap={2}>
          <Text variant="label">Severity</Text>
          <ChipGroup
            label="Severity"
            value={state.severity ?? ANY}
            onChange={(value) =>
              onChange({ severity: value === ANY ? undefined : (value as Severity) })
            }
            options={[
              { value: ANY, label: "Any" },
              { value: "LOW", label: "Low" },
              { value: "MEDIUM", label: "Medium" },
              { value: "HIGH", label: "High" },
              { value: "CRITICAL", label: "Critical" },
            ]}
          />
        </Stack>
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
  );
}
