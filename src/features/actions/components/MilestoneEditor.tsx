import { Row, Stack, Button, TextField, Text } from "@/components/ui";
import { InlineNotice } from "@/components/feedback";
import { LIMITS } from "@/lib/validation";
import { milestoneWarnings, type MilestoneDraft } from "../lib/assign";

export interface MilestoneEditorProps {
  rows: MilestoneDraft[];
  onChange: (rows: MilestoneDraft[]) => void;
  today: string;
  error?: string | undefined;
}

/** 1–20 ordered milestones: add, remove and reorder. Out-of-order dates warn, never block. */
export function MilestoneEditor({ rows, onChange, today, error }: MilestoneEditorProps) {
  const update = (index: number, patch: Partial<MilestoneDraft>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target] as MilestoneDraft, next[index] as MilestoneDraft];
    onChange(next);
  };
  const warnings = milestoneWarnings(rows, today);

  return (
    <Stack gap={3}>
      <Text variant="label">Milestones, in order</Text>
      {rows.map((row, index) => (
        <Stack key={index} gap={2}>
          <TextField
            label={`Milestone ${index + 1}`}
            value={row.title}
            onChangeText={(title) => update(index, { title })}
            maxLength={LIMITS.title}
            testID={`milestone-title-${index}`}
          />
          <TextField
            label={`Milestone ${index + 1} due (optional)`}
            value={row.due}
            placeholder="YYYY-MM-DD"
            onChangeText={(due) => update(index, { due })}
            maxLength={10}
            testID={`milestone-due-${index}`}
          />
          <Row gap={2} wrap>
            <Button
              label="Move up"
              variant="tertiary"
              size="desk"
              disabled={index === 0}
              onPress={() => move(index, -1)}
            />
            <Button
              label="Move down"
              variant="tertiary"
              size="desk"
              disabled={index === rows.length - 1}
              onPress={() => move(index, 1)}
            />
            <Button
              label="Remove"
              variant="tertiary"
              size="desk"
              disabled={rows.length === 1}
              onPress={() => onChange(rows.filter((_, i) => i !== index))}
            />
          </Row>
        </Stack>
      ))}
      <Button
        label="Add milestone"
        icon="plus"
        variant="secondary"
        size="desk"
        disabled={rows.length >= LIMITS.milestones}
        onPress={() => onChange([...rows, { title: "", due: "" }])}
        testID="add-milestone"
      />
      {warnings.map((warning) => (
        <InlineNotice key={warning} message={warning} />
      ))}
      {error ? <InlineNotice message={error} /> : null}
    </Stack>
  );
}
