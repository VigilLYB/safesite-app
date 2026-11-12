import type { IncidentStatus } from "@/lib/api";
import { Badge } from "@/components/ui";
import { statusLabel } from "./status";

/** Neutral status pill: finished states are solid ink with an icon. */
export function StatusPill({ status }: { status: IncidentStatus }) {
  if (status === "RESOLVED" || status === "CLOSED") {
    return <Badge label={statusLabel[status]} tone="inverse" icon="check" />;
  }
  if (status === "REJECTED") return <Badge label={statusLabel[status]} icon="x" />;
  return <Badge label={statusLabel[status]} />;
}
