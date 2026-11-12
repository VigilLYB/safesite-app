import { useState } from "react";
import { BottomSheet, Button, Stack, Text, TextField } from "@/components/ui";
import { LIMITS, noteSchema } from "@/lib/validation";
import { MutationError } from "./MutationError";

export interface NoteDialogProps {
  visible: boolean;
  title: string;
  /** What will happen, in one sentence ("Approve this report. It will then need an action."). */
  description?: string | undefined;
  confirmLabel: string;
  /** Reject and Reopen need a reason: Confirm stays disabled until one is typed. */
  required?: boolean | undefined;
  noteLabel?: string | undefined;
  pending?: boolean | undefined;
  error?: unknown;
  onConfirm: (note: string | undefined) => void;
  onClose: () => void;
}

/** Shared by workflow, link and unlink confirmations. Trims; a blank optional note is omitted. */
export function NoteDialog({ visible, ...rest }: NoteDialogProps) {
  if (!visible) return null;
  return <NoteForm {...rest} />;
}

function NoteForm({
  title,
  description,
  confirmLabel,
  required = false,
  noteLabel = required ? "Reason" : "Note (optional)",
  pending = false,
  error,
  onConfirm,
  onClose,
}: Omit<NoteDialogProps, "visible">) {
  const [note, setNote] = useState("");
  const parsed = noteSchema(required).safeParse(note);
  const problem = !parsed.success && note.length > 0 ? parsed.error.issues[0]?.message : undefined;

  return (
    <BottomSheet visible title={title} onClose={onClose}>
      <Stack gap={4}>
        {description ? <Text tone="muted">{description}</Text> : null}
        <TextField
          label={noteLabel}
          required={required}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={LIMITS.note + 200}
          error={problem}
          testID="note-input"
        />
        <MutationError error={error} />
        <Button
          label={confirmLabel}
          fullWidth
          loading={pending}
          disabled={!parsed.success}
          onPress={() => parsed.success && onConfirm(parsed.data === "" ? undefined : parsed.data)}
          testID="note-confirm"
        />
        <Button label="Cancel" variant="tertiary" size="desk" fullWidth onPress={onClose} />
      </Stack>
    </BottomSheet>
  );
}
