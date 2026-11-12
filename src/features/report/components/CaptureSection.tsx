import { Image, StyleSheet } from "react-native";
import { formatDuration } from "@/lib/format";
import { palette, radii } from "@/lib/theme";
import { Button, Card, Row, Stack, Text } from "@/components/ui";
import { FieldNotice } from "@/components/feedback";
import {
  AudioPlayerButton,
  VOICE_MAX_SECONDS,
  type PhotoCapture,
  type VoiceRecorder,
} from "@/features/media";

/** Photo first, then an optional voice note: one hand, no typing. */
export function CaptureSection({ photo, voice }: { photo: PhotoCapture; voice: VoiceRecorder }) {
  return (
    <Stack gap={4}>
      <Card>
        <Stack gap={3}>
          <Text variant="label">Photo</Text>
          {photo.photo ? (
            <>
              <Image
                source={{ uri: photo.photo.uri }}
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
                <Button
                  label="Remove"
                  variant="tertiary"
                  size="desk"
                  onPress={photo.clear}
                  testID="remove-photo"
                />
              </Row>
            </>
          ) : (
            <>
              <Button
                label="Take photo"
                icon="camera"
                fullWidth
                loading={photo.preparing}
                onPress={() => void photo.take()}
                testID="take-photo"
              />
              <Button
                label="Choose from library"
                variant="secondary"
                fullWidth
                onPress={() => void photo.choose()}
                testID="choose-photo"
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
              <Text variant="mono" accessibilityLiveRegion="polite" testID="recording">
                Recording… {Math.max(0, VOICE_MAX_SECONDS - Math.floor(voice.durationMs / 1000))} s
                left ({formatDuration(voice.durationMs / 3_600_000)})
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
                  label="Re-record"
                  variant="secondary"
                  size="desk"
                  icon="mic"
                  onPress={() => void voice.start()}
                />
                <Button
                  label="Delete"
                  variant="tertiary"
                  size="desk"
                  destructive
                  onPress={voice.clear}
                  testID="remove-voice"
                />
              </Row>
            </>
          ) : voice.supported ? (
            <Button
              label="Record voice note"
              icon="mic"
              variant="secondary"
              fullWidth
              onPress={() => void voice.start()}
              testID="record-voice"
            />
          ) : (
            <Text tone="muted" testID="voice-unsupported">
              Voice notes aren&apos;t available on this device yet. Type what you saw instead.
            </Text>
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
