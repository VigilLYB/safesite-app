import { z } from "zod";
import { severitySchema, type Incident } from "@/lib/api";
import { useZodForm } from "@/lib/forms";
import { BottomSheet, Button, ChipGroup, Stack, TextField } from "@/components/ui";
import { MutationError } from "@/components/feedback";
import { SEVERITIES, severityLabel } from "@/components/domain";
import { useEditIncident } from "../hooks/useIncidentMutations";

const schema = z.object({
  title: z.string().max(200, "Keep the title under 200 characters."),
  description: z.string().max(5000, "Keep the description under 5000 characters."),
  severity: severitySchema,
  note: z.string().max(2000, "Keep the note under 2000 characters."),
});

const OPTIONS = SEVERITIES.map((value) => ({ value, label: severityLabel[value] }));

export interface EditIncidentSheetProps {
  incident: Incident;
  visible: boolean;
  onClose: () => void;
}

/** Edits create a new immutable version, so the form sends the version it started from. */
export function EditIncidentSheet({ incident, visible, onClose }: EditIncidentSheetProps) {
  if (!visible) return null;
  return <EditForm incident={incident} onClose={onClose} />;
}

// Mounted only while open, so state resets each time without effects.
function EditForm({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const mutation = useEditIncident();
  const form = useZodForm(schema, {
    title: incident.title ?? "",
    description: incident.description ?? "",
    severity: incident.severity,
    note: "",
  });

  const save = () => {
    const values = form.validate();
    if (!values) return;
    mutation.mutate(
      {
        id: incident.id,
        expectedVersion: incident.version,
        ...(values.title !== (incident.title ?? "") ? { title: values.title || null } : {}),
        ...(values.description !== (incident.description ?? "")
          ? { description: values.description || null }
          : {}),
        ...(values.severity !== incident.severity ? { severity: values.severity } : {}),
        ...(values.note.trim() ? { note: values.note.trim() } : {}),
      },
      { onSuccess: onClose },
    );
  };

  return (
    <BottomSheet visible title="Edit report" onClose={onClose}>
      <Stack gap={4}>
        <ChipGroup
          label="Severity"
          options={OPTIONS}
          value={form.values.severity}
          onChange={(value) => form.set("severity", value)}
        />
        <TextField
          label="Title"
          value={form.values.title}
          onChangeText={(v) => form.set("title", v)}
          error={form.errors.title}
        />
        <TextField
          label="Description"
          value={form.values.description}
          onChangeText={(v) => form.set("description", v)}
          error={form.errors.description}
          multiline
        />
        <TextField
          label="Reason for the change"
          helper="Recorded on the timeline."
          value={form.values.note}
          onChangeText={(v) => form.set("note", v)}
          error={form.errors.note}
        />
        <MutationError error={mutation.error} />
        <Button label="Save changes" loading={mutation.isPending} onPress={save} fullWidth />
      </Stack>
    </BottomSheet>
  );
}
