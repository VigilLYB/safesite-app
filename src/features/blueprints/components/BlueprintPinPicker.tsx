import { useEffect, useState } from "react";
import { isApiError, type BlueprintDetail } from "@/lib/api";
import { Button, SelectField, Stack, Text } from "@/components/ui";
import { Banner, EmptyState, ErrorState, ListSkeleton, MapSkeleton } from "@/components/feedback";
import { useBlueprint, useBlueprints } from "../hooks/useBlueprints";
import { cacheBlueprint, getCachedBlueprint } from "../lib/blueprint-cache";
import { BlueprintMap } from "./BlueprintMap";

const isOffline = (error: unknown) => isApiError(error) && error.kind === "network";

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
 * several. With no signal, falls back to the one floor plan saved on this device (one plant, one
 * map - see lib/blueprint-cache.ts) so a worker can still drop a pin offline.
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

  const [cached, setCached] = useState<BlueprintDetail | null>(null);
  const [cacheChecked, setCacheChecked] = useState(false);
  useEffect(() => {
    void getCachedBlueprint().then((found) => {
      setCached(found);
      setCacheChecked(true);
    });
  }, []);
  useEffect(() => {
    if (detail.data) void cacheBlueprint(detail.data);
  }, [detail.data]);

  const usingCache =
    cacheChecked && Boolean(cached) && (isOffline(list.error) || isOffline(detail.error));
  const plan = usingCache ? cached : (detail.data ?? null);

  if (list.isPending || !cacheChecked) return <ListSkeleton rows={1} />;
  if (list.isError && !usingCache) {
    return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;
  }
  if (!usingCache && (!items || items.length === 0)) {
    return <EmptyState icon="map" title="No floor plan yet" message="Ask a manager to add one." />;
  }

  return (
    <Stack gap={3}>
      <Text variant="label">{label}</Text>
      {usingCache ? (
        <Banner
          icon="warn"
          message="Offline — showing the floor plan last saved on this device."
          testID="blueprint-offline-banner"
        />
      ) : null}
      {!usingCache && items && items.length > 1 ? (
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
      {!usingCache && detail.isPending ? <MapSkeleton /> : null}
      {!usingCache && detail.isError ? (
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
