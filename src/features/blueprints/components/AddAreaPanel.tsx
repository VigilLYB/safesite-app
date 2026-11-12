import { useState } from "react";
import { fieldErrors, userMessage, isApiError } from "@/lib/api";
import type { Point } from "@/lib/geometry";
import { areaFormSchema, LIMITS } from "@/lib/validation";
import { Button, Card, Stack, Text, TextField } from "@/components/ui";
import { InlineNotice, MutationError } from "@/components/feedback";
import { useAddArea } from "../hooks/useBlueprints";

export interface AddAreaPanelProps {
  blueprintId: string;
  points: readonly Point[];
  overlapsExisting: boolean;
  onUndo: () => void;
  onCancel: () => void;
  onSaved: () => void;
}

/** Draw mode controls: tap the plan for corners (3–100), name the area, save. */
export function AddAreaPanel({
  blueprintId,
  points,
  overlapsExisting,
  onUndo,
  onCancel,
  onSaved,
}: AddAreaPanelProps) {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const mutation = useAddArea(blueprintId);
  const enough = points.length >= LIMITS.polygonMin;

  const save = () => {
    const parsed = areaFormSchema.safeParse({ name });
    if (!parsed.success) return setNameError(parsed.error.issues[0]?.message);
    setNameError(undefined);
    mutation.mutate(
      { name: parsed.data.name, polygon: points.map(([x, y]) => [x, y] as [number, number]) },
      { onSuccess: onSaved },
    );
  };

  // 409: the name is taken on this blueprint.
  const taken = isApiError(mutation.error) && mutation.error.status === 409;
  const serverField = fieldErrors(mutation.error);

  return (
    <Card tone="subtle">
      <Stack gap={3}>
        <Text variant="heading">New area</Text>
        <Text tone="muted">
          Tap the plan to add corners. {points.length} so far; you need at least {LIMITS.polygonMin}
          .
        </Text>
        <TextField
          label="Area name"
          required
          value={name}
          onChangeText={setName}
          error={nameError ?? (taken ? userMessage(mutation.error) : serverField.name)}
          maxLength={LIMITS.name}
          testID="area-name"
        />
        {overlapsExisting ? (
          <InlineNotice message="This shape overlaps another area. A pin inside both is assigned to the first by name." />
        ) : null}
        {!taken ? <MutationError error={mutation.error} /> : null}
        <Button
          label="Undo last corner"
          variant="tertiary"
          size="desk"
          disabled={points.length === 0}
          onPress={onUndo}
        />
        <Button
          label="Save area"
          disabled={!enough}
          loading={mutation.isPending}
          onPress={save}
          testID="save-area"
        />
        <Button label="Cancel" variant="tertiary" size="desk" onPress={onCancel} />
      </Stack>
    </Card>
  );
}
