const base = require("./package.json").jest;
// babel-preset-expo is nested under expo, not hoisted.
const expoPreset = require.resolve("babel-preset-expo", {
  paths: [require.resolve("expo/package.json")],
});

/**
 * Live end-to-end suites against the hosted API. Serial, long timeouts.
 *   E2E_PASSWORD='<seed password>' npm run test:e2e
 * Optional: E2E_API_URL (default: the hosted demo), E2E_ALLOW_ADMIN_WRITES=1 to also create a user
 * and a blueprint (the API has no delete, so those rows are permanent).
 *
 * Two projects: "api" runs the app's own API modules in plain Node (real fetch); "ui" renders the
 * real screens (React Native environment) with a Node-backed fetch.
 */
process.env.EXPO_PUBLIC_API_BASE_URL =
  process.env.E2E_API_URL || "https://u16drhjo0a.execute-api.ap-south-1.amazonaws.com";
process.env.EXPO_PUBLIC_APP_TIME_ZONE = "Asia/Kolkata";
// One manifest per run: every entity the suites create is appended here, and the global teardown
// deletes exactly those rows (E2E_DATABASE_URL required; see e2e/purge.js).
process.env.E2E_MANIFEST ||= require("node:path").resolve(
  ".e2e-runs",
  `manifest-${process.pid}-${Date.now()}.jsonl`,
);

const common = { moduleNameMapper: base.moduleNameMapper };

module.exports = {
  maxWorkers: 1,
  globalSetup: "<rootDir>/e2e/global-setup.js",
  globalTeardown: "<rootDir>/e2e/global-teardown.js",
  // Global-only option: Jest ignores testTimeout inside `projects`, which left every live test at 5 s.
  testTimeout: 90_000,
  projects: [
    {
      ...common,
      displayName: "api",
      testEnvironment: "node",
      testMatch: ["<rootDir>/e2e/**/*.e2e.ts"],
      globals: { __DEV__: true },
      transform: { "^.+\\.[jt]sx?$": ["babel-jest", { presets: [expoPreset] }] },
      moduleNameMapper: {
        ...base.moduleNameMapper,
        "^expo-crypto$": "<rootDir>/e2e/stubs/expo-crypto.js",
      },
      testPathIgnorePatterns: ["/node_modules/"],
      // babel-preset-expo injects expo/virtual/env (EXPO_PUBLIC_* inlining), which is ESM.
      transformIgnorePatterns: ["/node_modules/(?!expo/virtual/)"],
    },
    {
      ...common,
      ...base,
      displayName: "ui",
      testMatch: ["<rootDir>/e2e/**/*.e2e.tsx"],
      testPathIgnorePatterns: ["/node_modules/", "/.expo/"],
      setupFiles: ["<rootDir>/e2e/setup-ui-fetch.js"],
      setupFilesAfterEnv: [...base.setupFilesAfterEnv, "<rootDir>/e2e/setup-ui-timeouts.js"],
    },
  ],
};
