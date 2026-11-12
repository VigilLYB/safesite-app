import type { AnalyticsFilters } from "@/lib/api";
import type { AnalyticsState } from "../lib/params";

/** What the shared Analytics screen hands to whichever view is showing. */
export interface AnalyticsContentProps {
  state: AnalyticsState;
  /** The same state as API filters (plant-time days -> exclusive-end ISO range). */
  filters: AnalyticsFilters;
  update: (patch: Partial<AnalyticsState>) => void;
}
