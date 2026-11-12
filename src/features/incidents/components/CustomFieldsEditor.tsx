import type { CustomFields } from "@/lib/api";
import { LIMITS } from "@/lib/validation";
import { Stack, Text, TextField, Toggle } from "@/components/ui";
import { KNOWN_FIELDS } from "../lib/custom-fields";

export interface CustomFieldsEditorProps {
  value: CustomFields;
  onChange: (value: CustomFields) => void;
}

/** Known fields as inputs; any other keys already on the report are shown read-only and preserved. */
export function CustomFieldsEditor({ value, onChange }: CustomFieldsEditorProps) {
  const unknown = Object.entries(value).filter(
    ([key]) => !KNOWN_FIELDS.some((field) => field.key === key),
  );
  const set = (key: string, next: string | boolean) => onChange({ ...value, [key]: next });
  return (
    <Stack gap={3}>
      {KNOWN_FIELDS.map((field) =>
        field.type === "boolean" ? (
          <Toggle
            key={field.key}
            label={field.label}
            value={value[field.key] === true}
            onChange={(next) => set(field.key, next)}
            testID={`custom-${field.key}`}
          />
        ) : (
          <TextField
            key={field.key}
            label={field.label}
            value={typeof value[field.key] === "string" ? (value[field.key] as string) : ""}
            onChangeText={(next) => set(field.key, next)}
            maxLength={LIMITS.customFieldValue}
            testID={`custom-${field.key}`}
          />
        ),
      )}
      {unknown.map(([key, raw]) => (
        <Text key={key} variant="caption" tone="muted">
          {key}: {String(raw)}
        </Text>
      ))}
    </Stack>
  );
}
