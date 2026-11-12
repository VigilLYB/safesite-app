import { useState } from "react";
import type { CustomFields, EditIncidentInput, Incident, Severity } from "@/lib/api";
import { uploadFile } from "@/lib/api";
import { LIMITS } from "@/lib/validation";
import { BottomSheet, Button, ChipGroup, Stack, Text, TextField } from "@/components/ui";
import { FieldNotice, MutationError } from "@/components/feedback";
import { SEVERITIES, severityLabel } from "@/components/domain";
import { usePhotoCapture } from "@/features/media";
import { mergeCustomFields, sameCustomFields, toCustomFields } from "../lib/custom-fields";
import { CustomFieldsEditor } from "./CustomFieldsEditor";

export interface EditIncidentDialogProps {
  incident: Incident;
  visible: boolean;
  error: unknown;
  pending: boolean;
  onSave: (patch: Omit<EditIncidentInput, "expectedVersion">) => Promise<void>;
  onClose: () => void;
}

export function EditIncidentDialog({ visible, ...rest }: EditIncidentDialogProps) {
  if (!visible) return null;
  return <EditForm {...rest} />;
}

const SEVERITY_OPTIONS = SEVERITIES.map((value) => ({ value, label: severityLabel[value] }));

/**
 * Guide §4.4 (a). Sends only what changed, plus `note`. Save stays disabled until a content
 * field changes — otherwise the server answers 400 "Nothing to change".
 */
function EditForm({
  incident,
  error,
  pending,
  onSave,
  onClose,
}: Omit<EditIncidentDialogProps, "visible">) {
  const [title, setTitle] = useState(incident.title ?? "");
  const [description, setDescription] = useState(incident.description ?? "");
  const [category, setCategory] = useState(incident.category ?? "");
  const [severity, setSeverity] = useState<Severity>(incident.severity);
  const [note, setNote] = useState("");
  const original = toCustomFields(incident.customFields);
  const [custom, setCustom] = useState<CustomFields>(original);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const photo = usePhotoCapture();

  const patch: Omit<EditIncidentInput, "expectedVersion"> = {};
  const t = title.trim();
  const d = description.trim();
  const c = category.trim();
  if (t !== (incident.title ?? "")) patch.title = t === "" ? null : t;
  if (d !== (incident.description ?? "")) patch.description = d === "" ? null : d;
  if (c !== (incident.category ?? "")) patch.category = c === "" ? null : c;
  if (severity !== incident.severity) patch.severity = severity;
  const merged = mergeCustomFields(original, custom);
  const customChanged = !sameCustomFields(original, merged);
  if (customChanged) patch.customFields = merged;
  const photoChanged = Boolean(photo.photo) || (removePhoto && incident.photo !== null);

  const tooLong =
    t.length > LIMITS.title ||
    d.length > LIMITS.description ||
    c.length > LIMITS.category ||
    note.trim().length > LIMITS.note;
  const changed = Object.keys(patch).length > 0 || photoChanged;

  const save = async () => {
    setUploadError(null);
    const body = { ...patch };
    if (photo.photo) {
      setUploading(true);
      try {
        body.photoKey = await uploadFile({
          uri: photo.photo.uri,
          kind: "photo",
          contentType: photo.photo.contentType,
        });
      } catch {
        setUploadError("The photo could not be uploaded. Try again.");
        setUploading(false);
        return;
      }
      setUploading(false);
    } else if (removePhoto && incident.photo) {
      body.photoKey = null;
    }
    if (note.trim()) body.note = note.trim();
    await onSave(body);
  };

  return (
    <BottomSheet visible title="Edit report" onClose={onClose}>
      <Stack gap={4}>
        <TextField
          label="Title"
          value={title}
          onChangeText={setTitle}
          maxLength={LIMITS.title + 50}
          testID="edit-title"
        />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          testID="edit-description"
        />
        <TextField
          label="Category"
          value={category}
          onChangeText={setCategory}
          maxLength={LIMITS.category + 20}
          testID="edit-category"
        />
        <Stack gap={2}>
          <Text variant="label">Severity</Text>
          <ChipGroup
            label="Severity"
            options={SEVERITY_OPTIONS}
            value={severity}
            onChange={setSeverity}
          />
        </Stack>
        <Stack gap={2}>
          <Text variant="label">Photo</Text>
          <Button
            label="Replace photo"
            variant="secondary"
            size="desk"
            icon="camera"
            onPress={() => void photo.choose()}
          />
          {incident.photo || photo.photo ? (
            <Button
              label={removePhoto ? "Keep the photo" : "Remove photo"}
              variant="tertiary"
              size="desk"
              onPress={() => setRemovePhoto((v) => !v)}
            />
          ) : null}
          {photo.photo ? <Text variant="caption">New photo ready to upload.</Text> : null}
          <FieldNotice message={photo.error ?? uploadError} />
        </Stack>
        <Stack gap={2}>
          <Text variant="label">Extra details</Text>
          <CustomFieldsEditor value={custom} onChange={setCustom} />
        </Stack>
        <TextField
          label="Reason for change"
          helper="Becomes part of the audit trail."
          value={note}
          onChangeText={setNote}
          multiline
          testID="edit-note"
        />
        <MutationError error={error} />
        <Button
          label="Save changes"
          fullWidth
          disabled={!changed || tooLong}
          loading={pending || uploading || photo.preparing}
          onPress={() => void save()}
          testID="edit-save"
        />
        <Button label="Cancel" variant="tertiary" size="desk" fullWidth onPress={onClose} />
      </Stack>
    </BottomSheet>
  );
}
