import type { Role, Severity } from "@/lib/api";
import { clock } from "@/lib/clock";
import { isStaff } from "@/lib/permissions";
import { plantDay } from "@/lib/plant-time";
import {
  Button,
  Card,
  DateRangeField,
  Row,
  SelectField,
  Stack,
  Text,
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

/** Severity and date range for everyone; reporter, place, duplicates and "mine" for staff. */
export function IncidentFilterPanel({ role, state, onChange, onClear }: IncidentFilterPanelProps) {
  const staff = isStaff(role);
  const blueprints = useBlueprints(staff);
  const planId =
    state.blueprintId ?? blueprints.data?.find((b) => b.isDefault)?.id ?? blueprints.data?.[0]?.id;
  const plan = useBlueprint(staff && state.areaId ? planId : state.blueprintId);

  return (
    <Card tone="subtle">
      <Stack gap={4}>
        <SelectField
          label="Severity"
          value={state.severity ?? ANY}
          options={SEVERITY_OPTIONS}
          onChange={(value) =>
            onChange({ severity: value === ANY ? undefined : (value as Severity) })
          }
          testID="filter-severity"
        />
        <Stack gap={1}>
          <Text variant="label">Reported</Text>
          <Row gap={2}>
            <DateRangeField
              label="Reported between"
              value={{ fromDay: state.fromDay, toDay: state.toDay }}
              today={plantDay(clock.now())}
              onChange={(range) => onChange({ fromDay: range.fromDay, toDay: range.toDay })}
              testID="filter-dates"
            />
          </Row>
        </Stack>
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
