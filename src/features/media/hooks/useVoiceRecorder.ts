import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  AudioModule,
  AudioQuality,
  IOSOutputFormat,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from "expo-audio";
import { MAX_RECORDING_MS, type VoiceRecorder } from "./voice-types";

/**
 * 16 kHz mono 16-bit PCM WAV (backend README, "Recording voice notes"). expo-audio can write
 * linear-PCM WAV on iOS. Android's MediaRecorder offers no WAV or OGG/Opus through expo-audio,
 * so voice notes are switched off there rather than uploading m4a the server rejects.
 */
const WAV_OPTIONS: RecordingOptions = {
  extension: ".wav",
  sampleRate: 16_000,
  numberOfChannels: 1,
  bitRate: 256_000,
  android: { extension: ".wav", outputFormat: "default", audioEncoder: "default" },
  ios: {
    extension: ".wav",
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.MEDIUM,
    sampleRate: 16_000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: "audio/wav" },
};

export function useVoiceRecorder(): VoiceRecorder {
  const recorder = useAudioRecorder(WAV_OPTIONS);
  const state = useAudioRecorderState(recorder);
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supported = Platform.OS === "ios";

  const stop = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    try {
      await recorder.stop();
      setUri(recorder.uri);
    } catch {
      setError("Couldn't save the recording. Try again.");
    }
  }, [recorder]);

  const start = useCallback(async () => {
    setError(null);
    if (!supported) {
      setError("Voice notes aren't available on this device yet. Type what you saw.");
      return;
    }
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError("Microphone access is off. Allow it in Settings, or type what you saw.");
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      timer.current = setTimeout(() => void stop(), MAX_RECORDING_MS); // stops itself at 60 s
    } catch {
      setError("Couldn't start recording. Try again, or type what you saw.");
    }
  }, [recorder, stop, supported]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return {
    supported,
    uri,
    contentType: "audio/wav",
    isRecording: state.isRecording,
    durationMs: state.durationMillis,
    error,
    start,
    stop,
    clear: () => setUri(null),
  };
}
