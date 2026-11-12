import { useLocalSearchParams } from "expo-router";
import { IncidentScreen } from "@/features/incidents";

export default function IncidentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <IncidentScreen id={id} />;
}
