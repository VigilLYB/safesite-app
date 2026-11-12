import { Image, StyleSheet } from "react-native";
import { formatDuration } from "@/lib/format";
import { palette, radii } from "@/lib/theme";
import { Button, Card, Row, Stack, Text } from "@/components/ui";
import { FieldNotice } from "@/components/feedback";
import { AudioPlayerButton } from "@/features/incidents";
import type { usePhotoCapture } from "../hooks/usePhotoCapture";
import type { useVoiceRecorder } from "../hooks/useVoiceRecorder";

export interface CaptureStepProps {
  photo: ReturnType<typeof usePhotoCapture>;
  voice: ReturnType<typeof useVoiceRecorder>;
}

/** Photo first, then an optional voice note: one hand, no typing. */
export function CaptureStep({ photo, voice }: CaptureStepProps) {
  return (
    <Stack gap={4}>
      <Card>
        <Stack gap={3}>
          <Text variant="label">Photo</Text>
          {photo.uri ? (
            <>
              <Image
                source={{ uri: photo.uri }}
                style={styles.preview}
                accessibilityLabel="Photo you took of the hazard"
              />
              <Row gap={2} wrap>
                <Button
                  label="Retake"
                  variant="secondary"
                  size="desk"
                  icon="camera"
                  onPress={() => void photo.take()}
                />
                <Button label="Remove" variant="tertiary" size="desk" onPress={photo.clear} />
              </Row>
            </>
          ) : (
            <>
              <Button
                label="Take photo"
                icon="camera"
                fullWidth
                onPress={() => void photo.take()}
                testID="take-photo"
              />
              <Button
                label="Choose from library"
                variant="secondary"
                fullWidth
                onPress={() => void photo.choose()}
              />
            </>
          )}
          <FieldNotice message={photo.error} />
        </Stack>
      </Card>

      <Card>
        <Stack gap={3}>
          <Text variant="label">Voice note (optional)</Text>
          {voice.isRecording ? (
            <>
              <Text variant="mono" accessibilityLiveRegion="polite">
                Recording… {formatDuration(voice.durationMs / 3_600_000)}
              </Text>
              <Button
                label="Stop recording"
                icon="stop"
                fullWidth
                onPress={() => void voice.stop()}
              />
            </>
          ) : voice.uri ? (
            <>
              <AudioPlayerButton uri={voice.uri} />
              <Row gap={2} wrap>
                <Button
                  label="Record again"
                  variant="secondary"
                  size="desk"
                  icon="mic"
                  onPress={() => void voice.start()}
                />
                <Button label="Remove" variant="tertiary" size="desk" onPress={voice.clear} />
              </Row>
            </>
          ) : (
            <Button
              label="Record voice note"
              icon="mic"
              variant="secondary"
              fullWidth
              onPress={() => void voice.start()}
              testID="record-voice"
            />
          )}
          <FieldNotice message={voice.error} />
        </Stack>
      </Card>
    </Stack>
  );
}

const styles = StyleSheet.create({
  preview: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radii.card,
    backgroundColor: palette.grey200,
  },
});
