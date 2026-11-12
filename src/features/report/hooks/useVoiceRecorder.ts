import { useCallback, useState } from "react";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

/** Hold-free voice note: tap to start, tap to stop. */
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError("Microphone access is off. Allow it in Settings, or type what you saw.");
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setError("Couldn't start recording. Try again, or type what you saw.");
    }
  }, [recorder]);

  const stop = useCallback(async () => {
    try {
      await recorder.stop();
      setUri(recorder.uri);
    } catch {
      setError("Couldn't save the recording. Try again.");
    }
  }, [recorder]);

  const clear = useCallback(() => setUri(null), []);

  return {
    uri,
    error,
    isRecording: state.isRecording,
    durationMs: state.durationMillis,
    start,
    stop,
    clear,
  };
}
