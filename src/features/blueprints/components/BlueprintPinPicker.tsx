import { Button, Stack, Text } from "@/components/ui";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/feedback";
import { useDefaultBlueprint } from "../hooks/useBlueprints";
import { BlueprintCanvas, PinMarker } from "./BlueprintCanvas";

export interface Pin {
  blueprintId: string;
  x: number;
  y: number;
}

export interface BlueprintPinPickerProps {
  value: Pin | null;
  onChange: (pin: Pin | null) => void;
}

/** Optional: tap the floor plan to mark the exact spot. */
export function BlueprintPinPicker({ value, onChange }: BlueprintPinPickerProps) {
  const { blueprint, isPending, isError, error, refetch } = useDefaultBlueprint();

  if (isPending) return <ListSkeleton rows={1} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!blueprint)
    return <EmptyState icon="map" title="No floor plan yet" message="Ask a manager to add one." />;

  return (
    <Stack gap={2}>
      <Text variant="label">Where is it? (optional)</Text>
      <BlueprintCanvas
        blueprint={blueprint}
        accessibilityLabel={`Floor plan of ${blueprint.name}`}
        onPressPoint={({ x, y }) => onChange({ blueprintId: blueprint.id, x, y })}
      >
        {(scale) => (value ? <PinMarker x={value.x} y={value.y} scale={scale} /> : null)}
      </BlueprintCanvas>
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
