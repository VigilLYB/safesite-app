import { useState } from "react";
import type { Incident } from "@/lib/api";
import { locationSourceLabel } from "@/lib/labels";
import { Button, Stack, Text } from "@/components/ui";
import { ErrorState, MapSkeleton, MutationError } from "@/components/feedback";
import {
  BlueprintMap,
  BlueprintPinPicker,
  useBlueprint,
  useDefaultBlueprint,
  type Pin,
} from "@/features/blueprints";
import type { Outcome } from "../../hooks/useIncidentChanges";

export interface LocationTabProps {
  incident: Incident;
  error: unknown;
  busy: boolean;
  onMove: (target: Pin) => Promise<Outcome>;
}

/** The pin on the plan, marked by how it was set. With `canEdit`: move it, then save or cancel. */
export function LocationTab({ incident, error, busy, onMove }: LocationTabProps) {
  const [draft, setDraft] = useState<Pin | null>(null);
  const [editing, setEditing] = useState(false);
  const fallback = useDefaultBlueprint();
  const blueprintId = incident.location.blueprintId ?? fallback.blueprint?.id;
  const plan = useBlueprint(blueprintId);
  const { location } = incident;

  if (plan.isPending && blueprintId) return <MapSkeleton />;
  if (plan.isError) return <ErrorState error={plan.error} onRetry={() => void plan.refetch()} />;

  const pinned =
    location.x !== null && location.y !== null
      ? [{ id: "current", x: location.x, y: location.y, source: location.source }]
      : [];

  return (
    <Stack gap={3} testID="tab-location">
      <Text variant="caption" tone="muted">
        {location.areaName ?? "No area"} · {locationSourceLabel[location.source]}
      </Text>
      {location.gps ? (
        <Text variant="caption" tone="muted">
          GPS fix {location.gps.lat.toFixed(5)}, {location.gps.lng.toFixed(5)}
          {location.gps.accuracyM !== null && location.gps.accuracyM !== undefined
            ? ` (±${Math.round(location.gps.accuracyM)} m)`
            : ""}
        </Text>
      ) : null}

      {editing ? (
        <>
          <BlueprintPinPicker
            value={draft}
            onChange={setDraft}
            initialBlueprintId={blueprintId}
            label="Tap the plan to move the pin"
          />
          <MutationError error={error} />
          <Button
            label="Save location"
            disabled={!draft}
            loading={busy}
            onPress={async () => {
              if (!draft) return;
              const outcome = await onMove(draft);
              if (outcome === "ok") {
                setEditing(false);
                setDraft(null);
              }
            }}
            testID="save-location"
          />
          <Button
            label="Cancel"
            variant="tertiary"
            size="desk"
            onPress={() => {
              setEditing(false);
              setDraft(null);
            }}
          />
        </>
      ) : (
        <>
          {plan.data ? (
            <BlueprintMap
              blueprint={plan.data}
              accessibilityLabel={`Floor plan ${plan.data.name}`}
              areas={plan.data.areas.map((area) => ({
                ...area,
                highlighted: area.id === location.areaId,
              }))}
              pins={pinned}
              onImageError={() => void plan.refetch()}
            />
          ) : (
            <Text tone="muted">No floor plan available.</Text>
          )}
          {incident.permissions.canEdit ? (
            <Button
              label={location.source === "NONE" ? "Drop a pin" : "Move pin"}
              icon="pin"
              variant="secondary"
              size="desk"
              onPress={() => setEditing(true)}
              testID="move-pin"
            />
          ) : null}
        </>
      )}
    </Stack>
  );
}
