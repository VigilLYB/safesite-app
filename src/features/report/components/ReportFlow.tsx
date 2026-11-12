import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { userMessage } from "@/lib/api";
import { palette, space } from "@/lib/theme";
import { Button, Screen, ScreenHeader, Stack, Text } from "@/components/ui";
import { FieldNotice } from "@/components/feedback";
import { SEVERITIES } from "@/components/domain";
import { useRoleRoutes } from "@/features/auth";
import { usePhotoCapture } from "../hooks/usePhotoCapture";
import { useReportDraft, type ReportStep } from "../hooks/useReportDraft";
import { useSubmitReport } from "../hooks/useSubmitReport";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { detailsSchema, hasContent } from "../lib/report-schema";
import { CaptureStep } from "./CaptureStep";
import { DetailsStep } from "./DetailsStep";
import { SeverityPicker } from "./SeverityPicker";
import { SubmittedView } from "./SubmittedView";

const TITLES: Record<ReportStep, string> = {
  1: "What did you see?",
  2: "How serious is it?",
  3: "Add details",
};

function StepBar({ step }: { step: ReportStep }) {
  return (
    <View
      style={styles.bar}
      accessibilityLabel={`Step ${step} of 3`}
      accessibilityRole="progressbar"
    >
      {([1, 2, 3] as const).map((value) => (
        <View key={value} style={[styles.segment, value <= step && styles.segmentOn]} />
      ))}
    </View>
  );
}

/** Three steps, one primary action each, drafts kept in memory until sent. */
export function ReportFlow() {
  const routes = useRoleRoutes();
  const { draft, patch, reset } = useReportDraft();
  const photo = usePhotoCapture();
  const voice = useVoiceRecorder();
  const submit = useSubmitReport();
  const [errors, setErrors] = useState<
    Partial<Record<"title" | "description" | "category", string>>
  >({});
  const [contentError, setContentError] = useState<string | null>(null);

  const startOver = () => {
    reset();
    photo.clear();
    voice.clear();
    submit.reset();
    setErrors({});
    setContentError(null);
  };

  if (submit.data) {
    return (
      <Screen>
        <SubmittedView
          result={submit.data}
          onDone={() => {
            startOver();
            routes.home();
          }}
          onAnother={startOver}
        />
      </Screen>
    );
  }

  const send = () => {
    const parsed = detailsSchema.safeParse({
      title: draft.title,
      description: draft.description,
      category: draft.category,
    });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof errors;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    const content = {
      photoUri: photo.uri,
      audioUri: voice.uri,
      title: draft.title,
      description: draft.description,
    };
    if (!hasContent(content)) {
      setContentError("Add a photo, a voice note or a few words so your supervisor can act on it.");
      return;
    }
    setContentError(null);
    if (!draft.severity || !SEVERITIES.includes(draft.severity)) return;
    submit.mutate({
      draft: { ...draft, severity: draft.severity },
      photoUri: photo.uri,
      audioUri: voice.uri,
    });
  };

  const footer = (
    <Stack gap={2}>
      <FieldNotice message={contentError} />
      {submit.error ? (
        <FieldNotice
          message={`${userMessage(submit.error)} Your report is kept: tap Submit to try again.`}
        />
      ) : null}
      {draft.step === 1 ? (
        <Button label="Next" fullWidth onPress={() => patch({ step: 2 })} testID="report-next" />
      ) : null}
      {draft.step === 2 ? (
        <Button
          label="Next"
          fullWidth
          disabled={!draft.severity}
          onPress={() => patch({ step: 3 })}
          testID="report-next"
        />
      ) : null}
      {draft.step === 3 ? (
        <Button
          label="Submit report"
          fullWidth
          loading={submit.isPending}
          onPress={send}
          testID="report-submit"
        />
      ) : null}
      {draft.step > 1 ? (
        <Button
          label="Back"
          variant="tertiary"
          size="desk"
          fullWidth
          onPress={() => patch({ step: (draft.step - 1) as ReportStep })}
        />
      ) : null}
    </Stack>
  );

  return (
    <Screen footer={footer}>
      <ScreenHeader eyebrow={`Step ${draft.step} of 3`} title={TITLES[draft.step]} />
      <StepBar step={draft.step} />
      {draft.step === 1 ? <CaptureStep photo={photo} voice={voice} /> : null}
      {draft.step === 2 ? (
        <Stack gap={2}>
          <SeverityPicker value={draft.severity} onChange={(severity) => patch({ severity })} />
          <Text variant="caption" tone="muted">
            If you are unsure, pick the higher level. A supervisor reviews every report.
          </Text>
        </Stack>
      ) : null}
      {draft.step === 3 ? <DetailsStep draft={draft} errors={errors} onChange={patch} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", gap: space[1] },
  segment: { flex: 1, height: 6, backgroundColor: palette.grey200 },
  segmentOn: { backgroundColor: palette.ink },
});
