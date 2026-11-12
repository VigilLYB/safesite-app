import { useRouter, type Href } from "expo-router";
import { TabStrip } from "@/components/ui";

const ROUTE: Record<string, string> = {
  overview: "/analytics",
  heatmap: "/analytics/heatmap",
  trends: "/analytics/trends",
};

/** Overview, Heatmap and Trends are routes under /analytics that share one filter state in the URL. */
export function AnalyticsTabs({
  current,
  query,
}: {
  current: "overview" | "heatmap" | "trends";
  query: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const qs = Object.entries(query)
    .filter(([key, value]) => value !== undefined && key !== "blueprintId")
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&");
  return (
    <TabStrip
      label="Analytics"
      tabs={[
        { value: "overview", label: "Overview" },
        { value: "heatmap", label: "Heatmap" },
        { value: "trends", label: "Trends" },
      ]}
      value={current}
      onChange={(tab) => router.replace(`${ROUTE[tab]}${qs ? `?${qs}` : ""}` as Href)}
    />
  );
}
