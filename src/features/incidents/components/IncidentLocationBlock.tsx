import type { Incident } from "@/lib/api";
import { Card, Stack, Text } from "@/components/ui";
import { BlueprintCanvas, PinMarker, useBlueprint } from "@/features/blueprints";

export function IncidentLocationBlock({ incident }: { incident: Incident }) {
  const { location } = incident;
  const blueprint = useBlueprint(location.blueprintId ?? undefined);
  const pinned = location.x !== null && location.y !== null;

  return (
    <Card>
      <Stack gap={2}>
        <Text variant="label">Location</Text>
        <Text variant="bodyLg">{location.areaName ?? "Area not set"}</Text>
        {location.source === "GPS_ESTIMATE" ? (
          <Text variant="caption" tone="muted">
            Estimated from GPS. A supervisor can move the pin.
          </Text>
        ) : null}
        {blueprint.data && pinned ? (
          <BlueprintCanvas
            blueprint={blueprint.data}
            accessibilityLabel={`Floor plan of ${blueprint.data.name}`}
          >
            {(scale) => <PinMarker x={location.x ?? 0} y={location.y ?? 0} scale={scale} />}
          </BlueprintCanvas>
        ) : null}
      </Stack>
    </Card>
  );
}
