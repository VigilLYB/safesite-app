import { useState } from "react";
import { Button, SelectField, Stack, Text } from "@/components/ui";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/feedback";
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

/** Pick mode: tap the floor plan to mark the spot. A blueprint selector appears when there are several. */
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

  if (list.isPending) return <ListSkeleton rows={1} />;
  if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;
  if (!items || items.length === 0) {
    return <EmptyState icon="map" title="No floor plan yet" message="Ask a manager to add one." />;
  }

  return (
    <Stack gap={3}>
      <Text variant="label">{label}</Text>
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
      {detail.isPending ? <ListSkeleton rows={1} /> : null}
      {detail.isError ? (
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      ) : null}
      {detail.data ? (
        <BlueprintMap
          blueprint={detail.data}
          accessibilityLabel={`Floor plan of ${detail.data.name}`}
          areas={detail.data.areas}
          pins={
            value && value.blueprintId === detail.data.id
              ? [{ id: "pin", ...value, draft: true }]
              : []
          }
          onPick={({ x, y }) => onChange({ blueprintId: detail.data.id, x, y })}
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
