import { Chip, ChipGroup, Row, Stack } from "@/components/ui";
import type { AnalyticsControls } from "../hooks/useAnalytics";

const RANGE = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
] as const;
const SHIFT = [
  { value: "ALL", label: "All shifts" },
  { value: "A", label: "A 06–14" },
  { value: "B", label: "B 14–22" },
  { value: "C", label: "C 22–06" },
] as const;
const SEVERITY = [
  { value: "ALL", label: "All severities" },
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
] as const;

/** Persistent filters: range, shift, severity, and "still open only". */
export function AnalyticsFilterBar({ controls }: { controls: AnalyticsControls }) {
  return (
    <Stack gap={2}>
      <Row gap={4} wrap>
        <ChipGroup
          label="Date range"
          options={RANGE}
          value={controls.range}
          onChange={controls.setRange}
        />
        <ChipGroup
          label="Shift"
          options={SHIFT}
          value={controls.shift}
          onChange={controls.setShift}
        />
      </Row>
      <Row gap={4} wrap>
        <ChipGroup
          label="Severity"
          options={SEVERITY}
          value={controls.severity}
          onChange={controls.setSeverity}
        />
        <Chip
          label="Still open only"
          selected={controls.activeOnly}
          onPress={() => controls.setActiveOnly(!controls.activeOnly)}
        />
      </Row>
    </Stack>
  );
}
