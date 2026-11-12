import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Button } from "@/components/ui";

/** Play / pause a voice note. Rendered only when a note exists (the player needs a source). */
export function AudioPlayerButton({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  return (
    <Button
      label={status.playing ? "Pause voice note" : "Play voice note"}
      icon={status.playing ? "stop" : "play"}
      variant="secondary"
      size="desk"
      onPress={() => (status.playing ? player.pause() : player.play())}
    />
  );
}
