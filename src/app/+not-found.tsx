import { Link } from "expo-router";
import { Screen } from "@/components/ui";
import { EmptyState } from "@/components/feedback";

export default function NotFound() {
  return (
    <Screen>
      <EmptyState icon="warn" title="Page not found" message="That screen doesn't exist." />
      <Link href="/">Go to the start</Link>
    </Screen>
  );
}
