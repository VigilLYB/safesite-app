import { useState } from "react";
import { useIsOnline } from "@/lib/offline/network";
import { Button, SelectField, Stack, Text } from "@/components/ui";
import { Banner, EmptyState, ErrorState, ListSkeleton, MapSkeleton } from "@/components/feedback";
import { useBlueprint, useBlueprints } from "../hooks/useBlueprints";
import { BlueprintMap } from "./BlueprintMap";

export interface Pin {
  blueprintId: string;
  x: number;
  y: number;
}

export interface BlueprintPinPickerProps {
  value: Pin | null;
  onChange: (pin: Pin | null) => void;
  /** Start on this blueprint (e.g. the report's current one) instead of the default. */
  initialBlueprintId?: string | null | undefined;
  label?: string | undefined;
}

/**
 * Pick mode: tap the floor plan to mark the spot. A blueprint selector appears when there are
 * several. Works with no signal: every floor plan's details are kept in the saved read cache and
 * its image is downloaded to the device after sign-in (hooks/useOfflineFloorPlans.ts), so a
 * worker can still drop a pin offline.
 */
export function BlueprintPinPicker({
  value,
  onChange,
  initialBlueprintId,
  label = "Where is it? (optional)",
}: BlueprintPinPickerProps) {
  const list = useBlueprints();
  const [chosen, setChosen] = useState<string | null>(
    value?.blueprintId ?? initialBlueprintId ?? null,
  );
  const items = list.data;
  const blueprintId =
    chosen ?? items?.find((item) => item.isDefault)?.id ?? items?.[0]?.id ?? undefined;
  const detail = useBlueprint(blueprintId);
  const online = useIsOnline();
  const plan = detail.data ?? null;

  if (list.isPending) return <ListSkeleton rows={1} />;
  if (list.isError && !items) {
    return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;
  }
  if (!items || items.length === 0) {
    return <EmptyState icon="map" title="No floor plan yet" message="Ask a manager to add one." />;
  }

  return (
    <Stack gap={3}>
      <Text variant="label">{label}</Text>
      {!online && plan ? (
        <Banner
          icon="wifi"
          message="Offline: showing the floor plan saved on this device."
          testID="blueprint-offline-banner"
        />
      ) : null}
      {items.length > 1 ? (
        <SelectField
          label="Floor plan"
          value={blueprintId ?? null}
          options={items.map((item) => ({ value: item.id, label: item.name }))}
          onChange={(id) => {
            setChosen(id);
            onChange(null);
          }}
        />
      ) : null}
      {detail.isPending ? <MapSkeleton /> : null}
      {detail.isError && !plan ? (
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      ) : null}
      {plan ? (
        <BlueprintMap
          blueprint={plan}
          accessibilityLabel={`Floor plan of ${plan.name}`}
          areas={plan.areas}
          pins={
            value && value.blueprintId === plan.id ? [{ id: "pin", ...value, draft: true }] : []
          }
          onPick={({ x, y }) => onChange({ blueprintId: plan.id, x, y })}
          onImageError={() => void detail.refetch()}
        />
      ) : null}
      {value ? (
        <Button label="Clear pin" variant="tertiary" size="desk" onPress={() => onChange(null)} />
      ) : (
        <Text variant="caption" tone="muted">
          Tap the plan to drop a pin.
        </Text>
      )}
    </Stack>
  );
}
