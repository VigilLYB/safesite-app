import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  analyticsApi,
  analyticsKeys,
  compact,
  type AnalyticsFilters,
  type Severity,
} from "@/lib/api";
import { clock } from "@/lib/clock";

const DAY_MS = 86_400_000;

export type RangeDays = "7" | "30" | "90";
export type Shift = "ALL" | "A" | "B" | "C";
export type SeverityScope = "ALL" | Severity;

export interface AnalyticsControls {
  range: RangeDays;
  shift: Shift;
  severity: SeverityScope;
  activeOnly: boolean;
  setRange: (value: RangeDays) => void;
  setShift: (value: Shift) => void;
  setSeverity: (value: SeverityScope) => void;
  setActiveOnly: (value: boolean) => void;
  /** API filters. `from` is computed when the range changes, so the cache key stays stable. */
  filters: AnalyticsFilters;
}

export function useAnalyticsControls(): AnalyticsControls {
  const [range, setRange] = useState<RangeDays>("30");
  const [shift, setShift] = useState<Shift>("ALL");
  const [severity, setSeverity] = useState<SeverityScope>("ALL");
  const [activeOnly, setActiveOnly] = useState(false);

  const from = useMemo(
    () => new Date(clock.nowMs() - Number(range) * DAY_MS).toISOString(),
    [range],
  );
  const filters = useMemo<AnalyticsFilters>(
    () => ({
      from,
      shift: shift === "ALL" ? undefined : shift,
      severity: severity === "ALL" ? undefined : severity,
      activeOnly: activeOnly || undefined,
    }),
    [from, shift, severity, activeOnly],
  );

  return {
    range,
    shift,
    severity,
    activeOnly,
    setRange,
    setShift,
    setSeverity,
    setActiveOnly,
    filters,
  };
}

export function useAnalyticsSummary(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.summary(compact(filters)),
    queryFn: ({ signal }) => analyticsApi.summary(filters, signal),
  });
}

export function useHeatmap(filters: AnalyticsFilters, blueprintId: string | undefined) {
  return useQuery({
    queryKey: analyticsKeys.heatmap(compact({ ...filters, blueprintId })),
    queryFn: ({ signal }) =>
      analyticsApi.heatmap({ ...filters, blueprintId: blueprintId as string }, signal),
    enabled: Boolean(blueprintId),
  });
}
