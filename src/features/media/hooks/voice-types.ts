export interface VoiceRecorder {
  /** false when this device cannot record a format the server accepts (guide §5.3). */
  supported: boolean;
  uri: string | null;
  /** WAV on iOS and web; m4a (AAC) on Android once the server accepts it. */
  contentType: "audio/wav" | "audio/mp4";
  isRecording: boolean;
  durationMs: number;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
}

export const MAX_RECORDING_MS = 60_000;
