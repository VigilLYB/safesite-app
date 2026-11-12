# SafeSite

Mobile-first industrial hazard reporting and safety management for **Plant X**.
React Native (Expo SDK 58, Expo Router), TypeScript strict, TanStack Query, Zod.

Design: monochrome, flat, borderless, 4/6/10px radii. Colour appears only as **severity**
(Low blue, Medium amber, High orange, Critical red; red is reserved for Critical).
Source of the design: `../safesite-mono.html`.

## Roles and screens

| Role | Layout | Screens |
|---|---|---|
| Worker | Bottom tabs, 56pt targets | Home, **Report** (photo + voice, severity, details + floor-plan pin), My reports, Report detail, Profile |
| Supervisor | Sidebar (>= 768pt) / bottom tabs; queue + detail split | Review queue (validate / approve / reject / reopen / close, edit, assign action, duplicates, PPE scan), Actions, Report detail, Profile |
| Safety manager | Same shell | Overview (KPIs, breakdowns, supervisor follow-through), Heatmap, Audit history (version timeline), Actions, Report detail, Profile |

## Run it

```bash
nvm use            # Node 22
npm ci
cp .env.example .env
npx expo start     # then i / a, or scan with a development build
```

Native modules used (camera, microphone, secure storage) need a **development build** when Expo Go
does not bundle them: `npx expo run:ios` or `npx expo run:android`.

## Checks

```bash
npm run check          # lint + format + typecheck + tests
npm run bundle:check   # Metro/Hermes bundle for iOS must build
```

CI runs the same on every PR (`.github/workflows/ci.yml`; `gate` is the only required check) and a weekly
read-only comparison of the live OpenAPI document with `docs/openapi.snapshot.json`.

## Configuration

Validated at startup by `src/lib/config`; a bad value stops the app and names the key, never the value.

| Variable | Required | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | yes | no trailing slash; https in release builds |
| `EXPO_PUBLIC_APP_TIME_ZONE` | no | display time zone, default `Asia/Kolkata` |

## API notes

- Auth: `POST /v1/auth/login` returns a JWT; it is stored in the OS keychain (`expo-secure-store`).
  A 401 on any authenticated call signs the user out once; a 401 on login is a wrong password.
- Reporting: `POST /v1/uploads` (presign) -> PUT bytes -> `POST /v1/incidents` with `clientSubmissionId`.
- Every edit/transition appends an immutable version; mutations send `expectedVersion`.
- `CUSTOM` corrective actions (hand-built milestones) are not exposed in the UI yet; templates and one-off tasks are.

## Not verified yet

- Never run on a device or simulator in this environment: only Jest (80 tests), lint, types and the
  iOS + Android Metro bundles were run.
- Not exercised against the live API (no credentials; the spec was read with GET only). The upload
  content types (`image/jpeg`, `audio/mp4`) are assumptions to confirm with the backend.
- No offline queue yet: a report that fails to send is kept in memory and can be re-submitted, but is lost if the app is closed.
