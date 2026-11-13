import { IncidentDetailScreen } from "@/features/incidents";

/** A report opened from an action stays in the Actions stack, so Back returns to the action. */
export default function ActionReport() {
  return <IncidentDetailScreen />;
}
