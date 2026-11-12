export interface VoiceRecorder {
  /** false when this device cannot produce a WAV the server accepts (guide §5.3). */
  supported: boolean;
  uri: string | null;
  contentType: "audio/wav";
  isRecording: boolean;
  durationMs: number;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
}

export const MAX_RECORDING_MS = 60_000;
