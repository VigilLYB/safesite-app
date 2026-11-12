import { SelectField, Stack, TextField } from "@/components/ui";
import { BlueprintPinPicker } from "@/features/blueprints";
import type { ReportDraft } from "../hooks/useReportDraft";
import { CATEGORY_OPTIONS } from "../lib/categories";

export interface DetailsStepProps {
  draft: ReportDraft;
  errors: Partial<Record<"title" | "description" | "category", string>>;
  onChange: (changes: Partial<ReportDraft>) => void;
}

export function DetailsStep({ draft, errors, onChange }: DetailsStepProps) {
  return (
    <Stack gap={4}>
      <TextField
        label="Title"
        helper="A few words, e.g. “Leak near pump P-204”."
        value={draft.title}
        onChangeText={(title) => onChange({ title })}
        error={errors.title}
        maxLength={200}
        returnKeyType="next"
        testID="report-title"
      />
      <SelectField
        label="Category"
        value={draft.category || null}
        options={CATEGORY_OPTIONS}
        onChange={(category) => onChange({ category })}
        error={errors.category}
      />
      <TextField
        label="What did you see?"
        value={draft.description}
        onChangeText={(description) => onChange({ description })}
        error={errors.description}
        multiline
        maxLength={5000}
        testID="report-description"
      />
      <BlueprintPinPicker value={draft.pin} onChange={(pin) => onChange({ pin })} />
    </Stack>
  );
}
