import { useState } from "react";
import { LIMITS } from "@/lib/validation";
import { Button, Card, SelectField, Stack, Text, TextField } from "@/components/ui";
import { CustomFieldsEditor } from "@/features/incidents";
import type { ReportDraft } from "../lib/draft-store";
import { CATEGORY_OPTIONS, isListedCategory, OTHER_CATEGORY } from "../lib/categories";

export interface DetailsSectionProps {
  draft: ReportDraft;
  errors: Partial<Record<"title" | "description" | "category", string>>;
  onChange: (changes: Partial<ReportDraft>) => void;
}

const counter = (value: string, max: number) => `${value.trim().length}/${max}`;

/**
 * Category is a dropdown of the usual hazards; "Other" opens a text box for a custom category
 * (sent as typed, up to 60 characters). Then title, description with counters, and extra details.
 */
export function DetailsSection({ draft, errors, onChange }: DetailsSectionProps) {
  const [showExtra, setShowExtra] = useState(false);
  // "Other" with nothing typed yet has no category value of its own, so remember the choice here.
  const [otherChosen, setOtherChosen] = useState(
    draft.category !== "" && !isListedCategory(draft.category),
  );
  const custom = otherChosen || (draft.category !== "" && !isListedCategory(draft.category));
  const choice = custom ? OTHER_CATEGORY : draft.category === "" ? null : draft.category;
  return (
    <Card>
      <Stack gap={4}>
        <Stack gap={2}>
          <SelectField
            label="Category"
            value={choice}
            options={CATEGORY_OPTIONS}
            placeholder="Choose a category"
            error={custom ? undefined : errors.category}
            onChange={(value) => {
              if (value === OTHER_CATEGORY) {
                setOtherChosen(true);
                onChange({ category: "" });
              } else {
                setOtherChosen(false);
                onChange({ category: value });
              }
            }}
            testID="report-category"
          />
          {custom ? (
            <TextField
              label="Custom category"
              value={draft.category}
              onChangeText={(category) => onChange({ category })}
              placeholder="What kind of hazard is it?"
              helper={counter(draft.category, LIMITS.category)}
              error={errors.category}
              maxLength={LIMITS.category}
              testID="report-category-custom"
            />
          ) : null}
        </Stack>
        <TextField
          label="Title"
          value={draft.title}
          onChangeText={(title) => onChange({ title })}
          helper={counter(draft.title, LIMITS.title)}
          error={errors.title}
          testID="report-title"
        />
        <TextField
          label="Description"
          value={draft.description}
          onChangeText={(description) => onChange({ description })}
          multiline
          helper={counter(draft.description, LIMITS.description)}
          error={errors.description}
          testID="report-description"
        />
        <Button
          label={showExtra ? "Hide extra details" : "Extra details"}
          variant="tertiary"
          size="desk"
          onPress={() => setShowExtra((v) => !v)}
        />
        {showExtra ? (
          <Stack gap={2}>
            <Text variant="caption" tone="muted">
              At most 30 details. Leave blank to skip.
            </Text>
            <CustomFieldsEditor value={draft.custom} onChange={(custom) => onChange({ custom })} />
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}
