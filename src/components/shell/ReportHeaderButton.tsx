import { useRouter } from "expo-router";
import { Button } from "@/components/ui";

/** The manager's way in to reporting: a button at the top right of every page header. */
export function ReportHeaderButton() {
  const router = useRouter();
  return (
    <Button
      label="Report"
      icon="camera"
      size="desk"
      onPress={() => router.push("/report")}
      testID="report-header-button"
    />
  );
}
