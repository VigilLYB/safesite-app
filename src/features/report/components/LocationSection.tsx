import { useState } from "react";
import { Button, Card, Stack, Text } from "@/components/ui";
import { BlueprintPinPicker, type Pin } from "@/features/blueprints";
import type { GpsState } from "../hooks/useDeviceLocation";

export interface LocationSectionProps {
  gps: GpsState;
  pin: Pin | null;
  onPin: (pin: Pin | null) => void;
}

/** Automatic GPS status, plus an optional "Place pin on map". GPS trouble never blocks submit. */
export function LocationSection({ gps, pin, onPin }: LocationSectionProps) {
  const [picking, setPicking] = useState(false);
  const status =
    gps.status === "ok"
      ? `Location captured${gps.accuracyM !== undefined ? ` (±${Math.round(gps.accuracyM)} m)` : ""}`
      : gps.status === "pending"
        ? "Getting your location…"
        : "Location unavailable";
  return (
    <Card>
      <Stack gap={3}>
        <Text variant="label">Location</Text>
        <Text accessibilityLiveRegion="polite" testID="gps-status">
          {status}
        </Text>
        {picking ? (
          <BlueprintPinPicker value={pin} onChange={onPin} />
        ) : (
          <Button
            label={pin ? "Change pin" : "Place pin on map"}
            icon="pin"
            variant="secondary"
            size="desk"
            onPress={() => setPicking(true)}
            testID="place-pin"
          />
        )}
        {pin && !picking ? (
          <Text variant="caption" tone="muted">
            Pin placed. It is used instead of the GPS estimate.
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}
