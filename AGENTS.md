This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

---

# SafeSite project rules

Industrial hazard reporting for Plant X. Roles: **Worker** (phone, gloves, one hand), **Supervisor** and
**Safety Manager** (tablet/desktop). One visual language, monochrome + severity colour only.
API: see `docs/openapi.snapshot.json` (read-only reference; never call mutating endpoints against the shared backend to "test").

## Before you change anything

- State the target (file, screen, role) first. Look for an existing component or hook before writing one.
- Find the cause before the fix. Stay in scope; report adjacent problems instead of fixing them.
- Routes in `src/app/` are **thin**: they render one screen from `src/features/*`. No logic in route files.
- Run `npm run check` (lint, format, types, tests) before saying "done". Say what you did not verify.

## Structure

```
src/app/            thin routes, one group per role: (worker) (supervisor) (manager)
src/features/<x>/   components/ hooks/ lib/ index.ts   (import a feature ONLY through its index.ts)
src/components/ui   the only UI primitives; import from "@/components/ui", never a deep path
src/components/domain   cross-feature domain atoms (SeverityBadge, StatusPill)
src/components/feedback EmptyState, ErrorState, QueryBoundary, Skeleton, MutationError
src/components/shell    RoleTabsLayout: one navigator shape for every role
src/lib/api         client, registry (all endpoints), schemas (Zod), query-keys, *.api.ts
src/lib/theme       tokens: the ONLY file with raw hex values
src/lib/format      all date / number / unit formatting ("—" for unknown, never 0)
src/lib/config      the ONLY reader of process.env (Zod-validated at startup)
src/lib/clock.ts    the ONLY source of "now" (inject it; lint bans new Date() / Date.now())
```

## Non-negotiables (each has a lint rule or a test)

- **Red is for CRITICAL only.** Severity is shape + label + pips, never colour alone (`tokens.test.ts`).
- **No raw colours** in components; use `@/lib/theme`. **No `fetch`** outside `src/lib/api`.
- **Every endpoint lives in `registry.ts`** and must exist in the OpenAPI snapshot (`registry.test.ts`).
- **Validate every response with Zod.** A mismatch is `RESPONSE_INVALID`, never a guess.
- **Idempotency:** create `clientSubmissionId` once per report (not per attempt). Mutations never auto-retry.
- **Mutations send `expectedVersion`;** a `409 STALE_VERSION` reloads the report and asks the person to retry.
- **Deny by default:** the server decides access (`incident.permissions`); the client only hides what the server says is not allowed.
- Touch targets: 56pt for workers, 44pt minimum elsewhere. Visible focus. Reduced motion respected.
- Server data lives in TanStack Query; UI state stays local. Query keys come from `query-keys.ts`.
- A lint warning is information: restructure rather than disabling the rule.
