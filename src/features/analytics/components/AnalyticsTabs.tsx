import { useRouter } from "expo-router";
import { TabStrip } from "@/components/ui";
import type { AnalyticsView } from "../lib/params";

/**
 * Overview, Heatmap and Trends are views of ONE screen, picked by a `view` URL parameter. The tab
 * strip stays mounted while only the content below it swaps, so its black underline can slide.
 */
export function AnalyticsTabs({ current }: { current: AnalyticsView }) {
  const router = useRouter();
  return (
    <TabStrip
      label="Analytics"
      tabs={[
        { value: "overview", label: "Overview" },
        { value: "heatmap", label: "Heatmap" },
        { value: "trends", label: "Trends" },
      ]}
      value={current}
      onChange={(view) => router.setParams({ view: view === "overview" ? undefined : view })}
    />
  );
}
