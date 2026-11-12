process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.test.invalid";
process.env.EXPO_PUBLIC_APP_TIME_ZONE = "Asia/Kolkata";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// Native audio is not available under Jest.
jest.mock("expo-audio", () => ({
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn() }),
  useAudioPlayerStatus: () => ({ playing: false }),
  useAudioRecorder: () => ({
    record: jest.fn(),
    prepareToRecordAsync: jest.fn(),
    stop: jest.fn(),
    uri: null,
  }),
  useAudioRecorderState: () => ({ isRecording: false, durationMillis: 0 }),
  AudioModule: { requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }) },
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn(),
}));

// Decorative loops (skeleton pulse) must not keep Jest alive; this also exercises the reduced-motion path.
jest.mock("@/lib/use-reduced-motion", () => ({ useReducedMotion: () => true }));
