# SafeSite

Mobile-first industrial hazard reporting and safety management for **Plant X**.
React Native (Expo SDK 58, Expo Router), TypeScript strict, TanStack Query, Zod.

Design: monochrome, flat, borderless, 4/6/10px radii. Colour appears only as **severity**
(Low blue, Medium amber, High orange, Critical red; red is reserved for Critical).
Source of the design: `../safesite-mono.html`.

## Roles and screens

One route map and one shell for every role (`frontend-page-guide.md` §3). `src/lib/routes.ts` is the
registry that decides who can open what; the server still enforces every rule, and buttons come from
the `permissions` object it returns.

| Route | Worker | Supervisor | Manager |
|---|---|---|---|
| `/report` Report a hazard | yes | yes | yes |
| `/incidents`, `/incidents/[id]`, `/incidents/[id]/versions/[n]` | own reports | all | all |
| `/actions`, `/actions/[id]` | view all, progress own | yes | yes |
| `/analytics`, `/analytics/heatmap` | Forbidden | yes | yes (home) |
| `/team` | Forbidden | read-only | add users |
| `/admin/blueprints`, `/new`, `/[id]` | Forbidden | Forbidden | yes |
| `/account`, `/login`, `/forbidden` | yes | yes | yes |

Web-only sections (Analytics, Team, Blueprints) are not listed in the phone navigation (guide §5.1).

## Run it

```bash
nvm use            # Node 22
npm ci
cp .env.example .env
npx expo start     # then i / a, or scan with a development build
```

Native modules used (camera, microphone, secure storage) need a **development build** when Expo Go
does not bundle them: `npx expo run:ios` or `npx expo run:android`.

## Checks and tests

```bash
npm run check          # lint + format + typecheck + all offline tests (239)
npm run bundle:check   # Metro/Hermes bundle for iOS must build
npm run test:e2e       # live suites against the hosted API (see below)
```

Test layers:

- **Unit** (`*.test.ts`): RBAC matrix, safe redirects, plant-time ranges, list/filter params, request-body
  builders, submit recovery (idempotent resend, re-upload), WAV/photo rules, error mapping.
- **Journeys** (`src/test/journeys/*`): the real route tree rendered with Expo Router against an in-memory
  API (`src/test/fake-backend.ts`) that mirrors the backend rules the UI depends on. One file per role:
  auth + RBAC + session, worker report, worker incidents/actions, supervisor, manager.
- **Live** (`e2e/*.e2e.ts`): the app's own API modules against the hosted API, one pipeline per case
  (auth, worker report, supervisor triage-to-resolved, manager close/reopen/analytics, duplicates + PPE,
  admin), plus `e2e/ui-live.e2e.tsx` (real screens, real backend).

```bash
E2E_PASSWORD='<seed password>' npm run test:e2e          # E2E_API_URL overrides the hosted URL
E2E_ALLOW_ADMIN_WRITES=1 E2E_PASSWORD=... npm run test:e2e   # also creates a user + a blueprint
```

Without `E2E_PASSWORD` the credential suites skip loudly and `e2e/public.e2e.ts` still runs. Live runs
create reports (the API has no delete); admin writes are opt-in because users and blueprints are permanent.

CI runs `npm run check` on every PR and a weekly read-only comparison of the live OpenAPI document with
`docs/openapi.snapshot.json`.

## Configuration

Validated at startup by `src/lib/config`; a bad value stops the app and names the key, never the value.

| Variable | Required | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | yes | no trailing slash; https in release builds |
| `EXPO_PUBLIC_APP_TIME_ZONE` | no | display time zone, default `Asia/Kolkata` |

## API notes

- Auth: `POST /v1/auth/login` returns a JWT, kept in the OS keychain (`expo-secure-store`). On web it is held
  in memory only (a reload signs out): the guide forbids storing it in localStorage. A 401 on any
  authenticated call signs the user out once; a 401 on login is a wrong password; a 5xx at boot is
  "service unavailable", never a logout.
- Reporting: `POST /v1/uploads` (presign) -> PUT bytes -> `POST /v1/incidents` with `clientSubmissionId`
  (created once per draft, reused by every retry).
- Voice notes must be 16 kHz mono WAV (or FLAC / OGG-Opus). m4a/AAC is rejected by the backend.
- Every edit/transition appends an immutable version; mutations send `expectedVersion`; a
  `409 STALE_VERSION` opens a dialog (review / apply again / discard) and never retries silently.

## Known gaps

- **Android voice notes are switched off.** `expo-audio` cannot write WAV or OGG/Opus on Android; it needs a
  native PCM recorder (e.g. `react-native-audio-record`) in a development build. iOS (linear PCM) and web
  (Web Audio -> WAV) work.
- **No offline queue / persisted drafts.** The draft survives navigation but not an app restart; after two
  failed resends the report stays on screen as "Saved on this device" for a manual retry.
- Upload progress is indeterminate (`fetch`, not XHR). The incident picker has no severity/area/date filters.
- Not run on a device or simulator here: Jest, lint, types, and the iOS + web Metro bundles were.
- The live credential suites were written from the backend source and its smoke test but have not been
  executed (no seed password was available); only `e2e/public.e2e.ts` has run against the hosted API.
