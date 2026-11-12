import { useState } from "react";
import { LIMITS } from "@/lib/validation";
import { Button, Card, Chip, Row, Stack, Text, TextField } from "@/components/ui";
import { CustomFieldsEditor } from "@/features/incidents";
import type { ReportDraft } from "../lib/draft-store";
import { CATEGORIES } from "../lib/categories";

export interface DetailsSectionProps {
  draft: ReportDraft;
  errors: Partial<Record<"title" | "description" | "category", string>>;
  onChange: (changes: Partial<ReportDraft>) => void;
}

const counter = (value: string, max: number) => `${value.trim().length}/${max}`;

/** Category (free text with suggestions), title, description with counters, and extra details. */
export function DetailsSection({ draft, errors, onChange }: DetailsSectionProps) {
  const [showExtra, setShowExtra] = useState(false);
  const suggestions = CATEGORIES.filter((c) =>
    c.toLowerCase().includes(draft.category.trim().toLowerCase()),
  ).slice(0, 4);
  return (
    <Card>
      <Stack gap={4}>
        <Stack gap={2}>
          <TextField
            label="Category"
            value={draft.category}
            onChangeText={(category) => onChange({ category })}
            helper={counter(draft.category, LIMITS.category)}
            error={errors.category}
            testID="report-category"
          />
          {draft.category.trim() !== suggestions[0] && suggestions.length > 0 ? (
            <Row gap={2} wrap>
              {suggestions.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  selected={draft.category === s}
                  onPress={() => onChange({ category: s })}
                />
              ))}
            </Row>
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
