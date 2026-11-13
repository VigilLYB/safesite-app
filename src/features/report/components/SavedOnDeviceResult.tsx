import { Button, Card, Stack, Text } from "@/components/ui";
import { Banner } from "@/components/feedback";

export interface SavedOnDeviceResultProps {
  /** Title or category, if the person gave one. */
  title: string;
  hasPhoto: boolean;
  hasVoice: boolean;
  onAnother: () => void;
  onDone: () => void;
}

/**
 * The report could not be sent now and is kept on the phone. Nothing for the person to do: the
 * app sends it when the connection returns (see the banner at the top to review what is waiting).
 */
export function SavedOnDeviceResult({
  title,
  hasPhoto,
  hasVoice,
  onAnother,
  onDone,
}: SavedOnDeviceResultProps) {
  const attachments = [hasPhoto ? "photo" : null, hasVoice ? "voice note" : null].filter(Boolean);
  return (
    <Stack gap={4} testID="report-saved-offline">
      <Banner
        icon="check"
        message="No connection right now, so your report is saved on this phone. It will be sent automatically when you're back online. You don't need to send it again."
        testID="report-saved-banner"
      />
      <Card>
        <Stack gap={1}>
          <Text variant="label">{title.trim() || "Untitled report"}</Text>
          <Text variant="caption" tone="muted">
            {attachments.length > 0
              ? `With ${attachments.join(" and ")}. Kept even if you close the app.`
              : "Kept even if you close the app."}
          </Text>
        </Stack>
      </Card>
      <Stack gap={2}>
        <Button label="Report another hazard" onPress={onAnother} testID="saved-another" />
        <Button label="Done" variant="secondary" onPress={onDone} testID="saved-done" />
      </Stack>
    </Stack>
  );
}
