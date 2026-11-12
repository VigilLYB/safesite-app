import { useState } from "react";
import type { Role, Severity } from "@/lib/api";
import { isStaff } from "@/lib/permissions";
import { YMD } from "@/lib/plant-time";
import {
  Button,
  Card,
  ChipGroup,
  SelectField,
  Stack,
  Text,
  TextField,
  Toggle,
} from "@/components/ui";
import { useBlueprint, useBlueprints } from "@/features/blueprints";
import { UserPicker } from "@/features/users";
import { effectiveRootsOnly, type ListState } from "../lib/list-params";

const ANY = "ANY";
const SEVERITY_OPTIONS = [
  { value: ANY, label: "Any" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
] as const;

export interface IncidentFilterPanelProps {
  role: Role;
  state: ListState;
  onChange: (patch: Partial<ListState>) => void;
  onClear: () => void;
}

function DateField({
  label,
  value,
  error,
  onApply,
  testID,
}: {
  label: string;
  value: string | undefined;
  error?: string | undefined;
  onApply: (day: string | undefined) => void;
  testID: string;
}) {
  const [text, setText] = useState(value ?? "");
  const invalid = text !== "" && !YMD.test(text);
  return (
    <TextField
      label={label}
      value={text}
      placeholder="YYYY-MM-DD"
      error={invalid ? "Use the format YYYY-MM-DD." : error}
      maxLength={10}
      testID={testID}
      onChangeText={(next) => {
        setText(next);
        if (next === "") onApply(undefined);
        else if (YMD.test(next) && !Number.isNaN(Date.parse(next))) onApply(next);
      }}
    />
  );
}

/** Severity and date range for everyone; reporter, place, duplicates and "mine" for staff. */
export function IncidentFilterPanel({ role, state, onChange, onClear }: IncidentFilterPanelProps) {
  const staff = isStaff(role);
  const blueprints = useBlueprints(staff);
  const planId =
    state.blueprintId ?? blueprints.data?.find((b) => b.isDefault)?.id ?? blueprints.data?.[0]?.id;
  const plan = useBlueprint(staff && state.areaId ? planId : state.blueprintId);
  const rangeBackwards = Boolean(state.fromDay && state.toDay && state.fromDay > state.toDay);

  return (
    <Card tone="subtle">
      <Stack gap={4}>
        <Stack gap={2}>
          <Text variant="label">Severity</Text>
          <ChipGroup
            label="Severity"
            options={SEVERITY_OPTIONS}
            value={state.severity ?? ANY}
            onChange={(value) =>
              onChange({ severity: value === ANY ? undefined : (value as Severity) })
            }
          />
        </Stack>
        <DateField
          label="From (plant time)"
          value={state.fromDay}
          onApply={(day) => onChange({ fromDay: day })}
          testID="filter-from"
        />
        <DateField
          label="To (plant time)"
          value={state.toDay}
          error={rangeBackwards ? "The start must be before the end." : undefined}
          onApply={(day) => onChange({ toDay: day })}
          testID="filter-to"
        />
        {staff ? (
          <>
            <UserPicker
              label="Reporter"
              anyLabel="Anyone"
              value={state.reporterId ?? null}
              onChange={(id) => onChange({ reporterId: id ?? undefined })}
              testID="filter-reporter"
            />
            {blueprints.data && blueprints.data.length > 0 ? (
              <SelectField
                label="Blueprint"
                value={state.blueprintId ?? ANY}
                options={[
                  { value: ANY, label: "Any" },
                  ...blueprints.data.map((b) => ({ value: b.id, label: b.name })),
                ]}
                onChange={(id) =>
                  onChange({ blueprintId: id === ANY ? undefined : id, areaId: undefined })
                }
              />
            ) : null}
            {plan.data && plan.data.areas.length > 0 ? (
              <SelectField
                label="Area"
                value={state.areaId ?? ANY}
                options={[
                  { value: ANY, label: "Any" },
                  ...plan.data.areas.map((a) => ({ value: a.id, label: a.name })),
                ]}
                onChange={(id) => onChange({ areaId: id === ANY ? undefined : id })}
              />
            ) : null}
            <Toggle
              label="Hide duplicates"
              value={effectiveRootsOnly(state)}
              onChange={(value) => onChange({ rootsOnly: value })}
              testID="filter-roots"
            />
            <Toggle
              label="Only my reports"
              value={Boolean(state.mine)}
              onChange={(value) => onChange({ mine: value || undefined })}
              testID="filter-mine"
            />
          </>
        ) : null}
        <Button
          label="Clear filters"
          variant="tertiary"
          size="desk"
          onPress={onClear}
          testID="clear-filters"
        />
      </Stack>
    </Card>
  );
}
