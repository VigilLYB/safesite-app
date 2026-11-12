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
npm run check          # lint + format + typecheck + all offline tests
npm run bundle:check   # Metro/Hermes bundle for iOS must build
npm run test:e2e       # live suites against the hosted API (see below)
```

Test layers:

- **Unit** (`*.test.ts`): RBAC matrix, safe redirects, plant-time ranges, list/filter params, request-body
  builders, submit recovery (idempotent resend, re-upload), WAV/photo rules, error mapping.
- **Journeys** (`src/test/journeys/*`): the real route tree rendered with Expo Router against an in-memory
  API (`src/test/fake-backend.ts`) that mirrors the backend rules the UI depends on. One file per role:
  auth + RBAC + session, worker report, worker incidents/actions, supervisor, manager, and retrying a
  failed transcription.
- **Live** (`e2e/*.e2e.ts`): the app's own API modules against the hosted API, one pipeline per case
  (auth, worker report, supervisor triage-to-resolved, manager close/reopen/analytics, duplicates + PPE,
  lifecycle edges: transcription retry, a worker as the assignee, rejection seen by the reporter; admin),
  plus `e2e/ui-live.e2e.tsx` (real screens, real backend: sign-in per role, report, validate).
- **Live data hygiene:** the duplicate detector links a new report under any open report from the last
  30 days, and the semantic model rates random test words as near-identical, so every live describe
  block retires what it created when it ends (rejects open reports, finishes unfinished actions). Without
  this, each run's leftovers made the next run's reports nest under them.

```bash
# From CodeBase/backend, with an `aws login --profile safesite` session (root only can read the DB secret):
eval "$(./scripts/remote-db-env.sh)"
cd ../frontend
E2E_DATABASE_URL="$DATABASE_URL" E2E_PASSWORD='<seed password>' npm run test:e2e
```

`E2E_API_URL` overrides the hosted URL. With `E2E_DATABASE_URL` set, the run **leaves the database exactly as
it found it**: every suite appends what it creates (reports, users, blueprints) to a manifest in
`.e2e-runs/`, and the Jest global teardown (`e2e/purge.js`) deletes exactly those rows in one transaction,
including their versions, actions, milestones and PPE scans. Incident history is append-only, so the purge
disables that trigger inside the transaction and re-enables it before commit. A report that a non-test
report is linked under is kept and named. Without `E2E_DATABASE_URL` nothing is deleted, the manifest is
kept, and `E2E_DATABASE_URL=… node e2e/purge.js <manifest>` removes it later. Uploaded media is not deleted
(S3 expires it after 14 days).

Without `E2E_PASSWORD` the credential suites skip loudly and `e2e/public.e2e.ts` still runs. The admin suite
(creates a user and a blueprint) runs only with `E2E_DATABASE_URL` (purged afterwards) or
`E2E_ALLOW_ADMIN_WRITES=1` (rows kept).

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

- **Android voice notes are switched off until the server accepts m4a.** `expo-audio` can only record AAC
  (.m4a) on Android. The recorder is already set up for it (16 kHz mono AAC); flip `SERVER_ACCEPTS_M4A` in
  `src/lib/audio-support.ts` once `POST /v1/uploads` accepts `audio/mp4` and the backend can transcribe it
  (Transcribe Streaming can't read AAC). iOS (linear PCM WAV) and web (Web Audio -> WAV) work today.
- **Workflow:** the app shows Approve as the single review step (it does not force an action); Validate
  still exists in the API but is never offered. Assign action appears once a report is approved.
- **No offline queue / persisted drafts.** The draft survives navigation but not an app restart; after two
  failed resends the report stays on screen as "Saved on this device" for a manual retry.
- Upload progress is indeterminate (`fetch`, not XHR). The incident picker has no severity/area/date filters.
- Not run on a device or simulator here: Jest, lint, types, and the iOS + web Metro bundles were.
- All live suites pass against the hosted API (87 tests including admin, 12 Nov 2026), and with the purge on
  every table's row count matched before and after the run.
