import { useState } from "react";
import { Alert } from "react-native";
import { transitionEventSchema, type Incident, type TransitionEvent } from "@/lib/api";
import { Button, Card, Row, Stack, Text, TextField } from "@/components/ui";
import { MutationError } from "@/components/feedback";
import { useTransition } from "../hooks/useIncidentMutations";

const LABEL: Record<TransitionEvent, string> = {
  validate: "Validate",
  approve: "Approve",
  reject: "Reject",
  reopen: "Reopen",
  close: "Close",
};

const NEEDS_CONFIRM: readonly TransitionEvent[] = ["reject", "close"];

/** The server lists which events this person may apply; each one becomes a timeline node. */
export function TransitionPanel({ incident }: { incident: Incident }) {
  const mutation = useTransition();
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | undefined>();

  const events = incident.permissions.transitions
    .map((name) => transitionEventSchema.safeParse(name))
    .flatMap((parsed) => (parsed.success ? [parsed.data] : []));
  if (events.length === 0) return null;

  const apply = (event: TransitionEvent) => {
    if (event === "reject" && note.trim().length === 0) {
      setNoteError("Add a reason so the reporter knows why.");
      return;
    }
    setNoteError(undefined);
    mutation.mutate(
      { id: incident.id, event, expectedVersion: incident.version, note: note.trim() || undefined },
      { onSuccess: () => setNote("") },
    );
  };

  const confirmThenApply = (event: TransitionEvent) => {
    if (!NEEDS_CONFIRM.includes(event)) return apply(event);
    Alert.alert(`${LABEL[event]} this report?`, "This is recorded on the report's timeline.", [
      { text: "Cancel", style: "cancel" },
      { text: LABEL[event], onPress: () => apply(event) },
    ]);
  };

  return (
    <Card>
      <Stack gap={3}>
        <Text variant="label">Decision</Text>
        <TextField
          label="Note"
          helper="Shown on the timeline. Required when rejecting."
          value={note}
          onChangeText={(value) => {
            setNote(value);
            setNoteError(undefined);
          }}
          error={noteError}
          multiline
          maxLength={2000}
        />
        <Row gap={2} wrap>
          {events.map((event, index) => (
            <Button
              key={event}
              label={LABEL[event]}
              size="desk"
              variant={index === 0 && event !== "reject" ? "primary" : "secondary"}
              icon={event === "reject" ? "warn" : undefined}
              loading={mutation.isPending && mutation.variables?.event === event}
              disabled={mutation.isPending}
              onPress={() => confirmThenApply(event)}
            />
          ))}
        </Row>
        <MutationError error={mutation.error} />
      </Stack>
    </Card>
  );
}
