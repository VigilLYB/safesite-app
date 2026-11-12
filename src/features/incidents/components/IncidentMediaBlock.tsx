import { Image, StyleSheet } from "react-native";
import type { Incident } from "@/lib/api";
import { palette, radii } from "@/lib/theme";
import { Button, Card, Stack, Text } from "@/components/ui";
import { InlineNotice, MutationError } from "@/components/feedback";
import { useRetryTranscription } from "../hooks/useIncidentMutations";
import { AudioPlayerButton } from "./AudioPlayerButton";

export function IncidentMediaBlock({ incident }: { incident: Incident }) {
  const retry = useRetryTranscription();
  const { photo, audio, transcript, processing } = incident;
  if (!photo && !audio && !transcript && processing.transcription === "NOT_REQUIRED") return null;

  return (
    <Card>
      <Stack gap={3}>
        {photo ? (
          <Image
            source={{ uri: photo.url }}
            style={styles.photo}
            resizeMode="cover"
            accessibilityLabel="Photo of the hazard"
          />
        ) : null}
        {audio ? <AudioPlayerButton uri={audio.url} /> : null}
        {processing.transcription === "PENDING" ? (
          <InlineNotice message="Transcribing the voice note…" />
        ) : null}
        {processing.transcription === "FAILED" ? (
          <Stack gap={2}>
            <InlineNotice message="The voice note could not be transcribed." />
            {incident.permissions.canEdit ? (
              <Button
                label="Retry transcription"
                variant="secondary"
                size="desk"
                loading={retry.isPending}
                onPress={() => retry.mutate(incident.id)}
              />
            ) : null}
            <MutationError error={retry.error} />
          </Stack>
        ) : null}
        {transcript ? (
          <Stack gap={1}>
            <Text variant="label">
              Transcript{incident.transcriptLanguage ? ` (${incident.transcriptLanguage})` : ""}
            </Text>
            <Text>{transcript}</Text>
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radii.card,
    backgroundColor: palette.grey200,
  },
});
