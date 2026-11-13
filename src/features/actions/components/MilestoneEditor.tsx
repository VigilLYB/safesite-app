import { useState } from "react";
import { Button, DayCalendar, DayPickerButton, Row, Stack, Text, TextField } from "@/components/ui";
import { InlineNotice } from "@/components/feedback";
import { LIMITS } from "@/lib/validation";
import { milestoneWarnings, type MilestoneDraft } from "../lib/assign";

export interface MilestoneEditorProps {
  rows: MilestoneDraft[];
  onChange: (rows: MilestoneDraft[]) => void;
  today: string;
  error?: string | undefined;
}

/**
 * 1–20 ordered milestones: add, remove and reorder. Each title box has a calendar button at its
 * right edge for the optional due day. Out-of-order dates warn, never block.
 */
export function MilestoneEditor({ rows, onChange, today, error }: MilestoneEditorProps) {
  const [calendarFor, setCalendarFor] = useState<number | null>(null);
  const update = (index: number, patch: Partial<MilestoneDraft>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target] as MilestoneDraft, next[index] as MilestoneDraft];
    setCalendarFor(null);
    onChange(next);
  };
  const warnings = milestoneWarnings(rows, today);

  return (
    <Stack gap={3}>
      <Text variant="label">Milestones, in order</Text>
      <Text variant="caption" tone="muted">
        Use the calendar in each box to set an optional due date.
      </Text>
      {rows.map((row, index) => (
        <Stack key={index} gap={2}>
          <TextField
            label={`Milestone ${index + 1}`}
            value={row.title}
            onChangeText={(title) => update(index, { title })}
            maxLength={LIMITS.title}
            testID={`milestone-title-${index}`}
            trailing={
              <DayPickerButton
                label={`Milestone ${index + 1} due date`}
                value={row.due}
                open={calendarFor === index}
                onPress={() => setCalendarFor(calendarFor === index ? null : index)}
                testID={`milestone-due-${index}`}
              />
            }
          />
          {calendarFor === index ? (
            <DayCalendar
              label={`Milestone ${index + 1} due date`}
              value={row.due}
              today={today}
              onChange={(due) => update(index, { due })}
              onClose={() => setCalendarFor(null)}
              testID={`milestone-calendar-${index}`}
            />
          ) : null}
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
              onPress={() => {
                setCalendarFor(null);
                onChange(rows.filter((_, i) => i !== index));
              }}
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
