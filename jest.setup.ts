// Reanimated / Gesture Handler have no native side under Jest. Reanimated itself is mapped to
// src/test/reanimated-mock.js in the Jest config (so expo-router's test mocks resolve to it too).
import "react-native-gesture-handler/jestSetup";

// The live suites (npm run test:e2e) point this at the hosted API; unit and journey tests never do.
process.env.EXPO_PUBLIC_API_BASE_URL ||= "https://api.test.invalid";
process.env.EXPO_PUBLIC_APP_TIME_ZONE = "Asia/Kolkata";

jest.mock("react-native-worklets", () =>
  jest.requireActual("react-native-worklets/lib/module/mock"),
);

// NetInfo has no native module under Jest (the offline report queue listens to it). The library's
// own mock reports online and reachable.
jest.mock("@react-native-community/netinfo", () =>
  jest.requireActual("@react-native-community/netinfo/jest/netinfo-mock.js"),
);

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
  IOSOutputFormat: { LINEARPCM: "lpcm" },
  AudioQuality: { MEDIUM: 64 },
  setAudioModeAsync: jest.fn(),
}));

// Decorative loops (skeleton pulse) must not keep Jest alive; this also exercises the reduced-motion path.
jest.mock("@/lib/use-reduced-motion", () => ({ useReducedMotion: () => true }));

// In-memory keychain so journeys can start signed in (or prove nothing is persisted).
jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    deleteItemAsync: jest.fn(async (key: string) => void store.delete(key)),
  };
});

jest.mock("expo-location", () => ({
  Accuracy: { High: 4 },
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  getLastKnownPositionAsync: jest
    .fn()
    .mockResolvedValue({ coords: { latitude: 19.07, longitude: 72.87, accuracy: 25 } }),
  getCurrentPositionAsync: jest
    .fn()
    .mockResolvedValue({ coords: { latitude: 19.07, longitude: 72.87, accuracy: 25 } }),
}));

jest.mock("expo-image-picker", () => {
  const asset = {
    uri: "data:image/jpeg;base64,AAAA",
    width: 1200,
    height: 900,
    mimeType: "image/jpeg",
  };
  const picked = jest.fn().mockResolvedValue({ canceled: false, assets: [asset] });
  return {
    requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    launchCameraAsync: picked,
    launchImageLibraryAsync: picked,
  };
});

jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  manipulateAsync: jest.fn(async (uri: string) => ({ uri, width: 1200, height: 900 })),
}));

// expo-crypto has no native module under Jest; Node's crypto is a faithful stand-in.
jest.mock("expo-crypto", () => {
  const nodeCrypto = jest.requireActual("node:crypto");
  return {
    randomUUID: () => nodeCrypto.randomUUID(),
    getRandomBytes: (length: number) => new Uint8Array(nodeCrypto.randomBytes(length)),
  };
});
