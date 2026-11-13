import { useState } from "react";
import { useRouter, type Href } from "expo-router";
import { isApiError, userMessage } from "@/lib/api";
import { reportDetailsSchema } from "@/lib/validation";
import { useBreakpoint } from "@/lib/responsive";
import { homeFor } from "@/lib/routes";
import { Button, Screen, ScreenHeader, Section, Stack, Text } from "@/components/ui";
import { FieldNotice } from "@/components/feedback";
import { clock } from "@/lib/clock";
import { useSession } from "@/features/auth";
import { usePhotoCapture, useVoiceRecorder } from "@/features/media";
import { useDeviceLocation } from "../hooks/useDeviceLocation";
import { NotSaved, useSubmitReport } from "../hooks/useSubmitReport";
import { hasContent } from "../lib/body";
import { useReportDraft } from "../lib/draft-store";
import { SavedOnDevice } from "../lib/submit";
import { CaptureSection } from "./CaptureSection";
import { DetailsSection } from "./DetailsSection";
import { LocationSection } from "./LocationSection";
import { ReportResult } from "./ReportResult";
import { SavedOnDeviceResult } from "./SavedOnDeviceResult";
import { SeverityPicker } from "./SeverityPicker";

type FieldErrors = Partial<Record<"title" | "description" | "category", string>>;

/** Report a hazard (guide §4.2): one page, a complete report in under a minute. */
export function ReportScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { isTablet } = useBreakpoint();
  const { draft, patch, reset } = useReportDraft();
  const photo = usePhotoCapture();
  const voice = useVoiceRecorder();
  const gps = useDeviceLocation();
  const submit = useSubmitReport();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [contentError, setContentError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const startOver = () => {
    reset();
    photo.clear();
    voice.clear();
    submit.reset();
    setErrors({});
    setContentError(null);
    setConfirmDiscard(false);
  };

  const goHome = () => {
    startOver();
    router.replace(homeFor(user?.role ?? "WORKER", !isTablet) as Href);
  };

  // Saved on the device (no connection). The draft has already been reset: the saved copy is
  // sent automatically, so the form is not shown again with that report in it.
  if (submit.error instanceof SavedOnDevice && submit.variables) {
    return (
      <Screen testID="report-screen">
        <ScreenHeader title="Saved on this device" />
        <SavedOnDeviceResult
          title={submit.variables.input.title || submit.variables.input.category}
          hasPhoto={Boolean(submit.variables.photo)}
          hasVoice={Boolean(submit.variables.audio)}
          onAnother={startOver}
          onDone={goHome}
        />
      </Screen>
    );
  }

  if (submit.data) {
    return (
      <Screen testID="report-screen">
        <ScreenHeader title="Report sent" />
        <ReportResult result={submit.data} onAnother={startOver} onDone={goHome} />
      </Screen>
    );
  }

  const send = () => {
    const parsed = reportDetailsSchema.safeParse({
      title: draft.title,
      description: draft.description,
      category: draft.category,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    if (
      !hasContent({
        hasPhoto: Boolean(photo.photo),
        hasVoice: Boolean(voice.uri),
        title: draft.title,
        description: draft.description,
      })
    ) {
      setContentError(
        "Add a photo, a voice note, a title or a description so your supervisor can act on it.",
      );
      return;
    }
    setContentError(null);
    submit.mutate({
      input: {
        clientSubmissionId: draft.clientSubmissionId, // created once per draft, reused on every retry
        severity: draft.severity,
        category: draft.category,
        title: draft.title,
        description: draft.description,
        pin: draft.pin,
        gps: gps.status === "ok" ? { lat: gps.lat, lng: gps.lng, accuracyM: gps.accuracyM } : null,
        custom: draft.custom,
        capturedAt: new Date(clock.nowMs()).toISOString(),
      },
      photo: photo.photo ? { uri: photo.photo.uri, contentType: photo.photo.contentType } : null,
      audio: voice.uri ? { uri: voice.uri, contentType: voice.contentType } : null,
    });
  };

  const serverMessage =
    submit.error instanceof NotSaved
      ? submit.error.message
      : submit.error
        ? isApiError(submit.error) && submit.error.kind === "validation"
          ? submit.error.message
          : userMessage(submit.error)
        : null;
  const progress = submit.isPending
    ? photo.photo || voice.uri
      ? "Uploading and saving…"
      : "Saving and transcribing…"
    : null;

  return (
    <Screen
      testID="report-screen"
      footer={
        <Stack gap={2}>
          <FieldNotice message={contentError} />
          <FieldNotice message={serverMessage} />
          {progress ? (
            <Text
              variant="caption"
              tone="muted"
              accessibilityLiveRegion="polite"
              testID="submit-progress"
            >
              {progress}
            </Text>
          ) : null}
          <Button
            label="Send report"
            fullWidth
            loading={submit.isPending}
            onPress={send}
            testID="report-submit"
          />
        </Stack>
      }
    >
      <ScreenHeader
        title="Report a hazard"
        subtitle="Photo, voice note or a few words. Everything is optional except one of them."
      />
      <CaptureSection photo={photo} voice={voice} />
      <Section title="How serious is it?" icon="warn">
        <SeverityPicker value={draft.severity} onChange={(severity) => patch({ severity })} />
        <Text variant="caption" tone="muted">
          If you are unsure, pick the higher level. A supervisor reviews every report.
        </Text>
      </Section>
      <Section title="What happened" icon="clip">
        <DetailsSection draft={draft} errors={errors} onChange={patch} />
      </Section>
      <LocationSection gps={gps} pin={draft.pin} onPin={(pin) => patch({ pin })} />
      {confirmDiscard ? (
        <Stack gap={2}>
          <Text>Discard this draft and its photo and voice note?</Text>
          <Button
            label="Discard draft"
            variant="secondary"
            size="desk"
            destructive
            onPress={startOver}
            testID="discard-confirm"
          />
          <Button
            label="Keep draft"
            variant="tertiary"
            size="desk"
            onPress={() => setConfirmDiscard(false)}
          />
        </Stack>
      ) : (
        <Button
          label="Discard draft"
          variant="tertiary"
          size="desk"
          destructive
          onPress={() => setConfirmDiscard(true)}
          testID="discard-draft"
        />
      )}
    </Screen>
  );
}
