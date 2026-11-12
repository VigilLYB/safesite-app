import { useRouter, type Href } from "expo-router";
import { TabStrip } from "@/components/ui";

/** Overview and Heatmap are two routes under /analytics that share one filter state in the URL. */
export function AnalyticsTabs({
  current,
  query,
}: {
  current: "overview" | "heatmap";
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
      ]}
      value={current}
      onChange={(tab) =>
        router.replace(
          `${tab === "overview" ? "/analytics" : "/analytics/heatmap"}${qs ? `?${qs}` : ""}` as Href,
        )
      }
    />
  );
}
