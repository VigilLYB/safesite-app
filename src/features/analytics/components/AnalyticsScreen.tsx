import { useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { analyticsKeys } from "@/lib/api";
import { Screen, ScreenHeader } from "@/components/ui";
import { parseAnalyticsParams, parseView, toAnalyticsFilters, toUrl } from "../lib/params";
import type { AnalyticsState } from "../lib/params";
import { AnalyticsFilterBar } from "./AnalyticsFilterBar";
import { AnalyticsTabs } from "./AnalyticsTabs";
import { HeatmapContent } from "./HeatmapScreen";
import { OverviewContent } from "./OverviewScreen";
import { TrendsContent } from "./TrendsScreen";

/**
 * The one Analytics screen (guide §4.8, §4.9). The header, tab strip and filters stay mounted;
 * switching Overview / Heatmap / Trends only swaps the content below, so only that part loads and
 * the tab underline slides instead of the page flashing.
 */
export function AnalyticsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const view = parseView(params as never);
  const state = useMemo(() => parseAnalyticsParams(params as never), [params]);
  const filters = useMemo(() => toAnalyticsFilters(state), [state]);
  const refreshing = useIsFetching({ queryKey: analyticsKeys.all }) > 0;
  const update = (patch: Partial<AnalyticsState>) =>
    router.setParams(toUrl({ ...state, ...patch }));
  const content = { state, filters, update };

  return (
    <Screen
      onRefresh={() => void queryClient.invalidateQueries({ queryKey: analyticsKeys.all })}
      refreshing={refreshing}
      testID="analytics-screen"
    >
      <ScreenHeader title="Analytics" subtitle="Reports and follow-through for the plant." />
      <AnalyticsTabs current={view} />
      <AnalyticsFilterBar state={state} onChange={update} showBlueprint={view === "overview"} />
      {view === "overview" ? <OverviewContent {...content} /> : null}
      {view === "heatmap" ? <HeatmapContent {...content} /> : null}
      {view === "trends" ? <TrendsContent {...content} /> : null}
    </Screen>
  );
}
