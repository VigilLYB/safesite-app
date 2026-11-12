import { Redirect, useLocalSearchParams } from "expo-router";

/** Old deep link: Analytics is one screen now, and heatmap is one of its views. */
export default function Legacy() {
  const params = useLocalSearchParams<Record<string, string>>();
  return <Redirect href={{ pathname: "/analytics", params: { ...params, view: "heatmap" } }} />;
}
