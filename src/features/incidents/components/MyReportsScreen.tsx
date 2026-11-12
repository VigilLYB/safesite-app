import { useState } from "react";
import { Screen, ChipGroup, ScreenHeader, Stack } from "@/components/ui";
import { FINISHED, IN_PROGRESS, NEEDS_REVIEW } from "@/components/domain";
import { useRoleRoutes } from "@/features/auth";
import { IncidentList } from "./IncidentList";

type Scope = "all" | "open" | "finished";

const OPTIONS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "finished", label: "Finished" },
] as const;

const STATUS: Record<Scope, string | undefined> = {
  all: undefined,
  open: `${NEEDS_REVIEW},${IN_PROGRESS}`,
  finished: FINISHED,
};

/** Everything the signed-in worker has reported, newest first. */
export function MyReportsScreen() {
  const routes = useRoleRoutes();
  const [scope, setScope] = useState<Scope>("all");
  return (
    <Screen scroll={false}>
      <IncidentList
        filters={{ mine: true, status: STATUS[scope], limit: 25 }}
        onSelect={(incident) => routes.openIncident(incident.id)}
        emptyTitle="No reports here"
        emptyMessage="Reports you send show up here with their status."
        header={
          <Stack gap={3}>
            <ScreenHeader title="My reports" />
            <ChipGroup label="Filter reports" options={OPTIONS} value={scope} onChange={setScope} />
          </Stack>
        }
      />
    </Screen>
  );
}
