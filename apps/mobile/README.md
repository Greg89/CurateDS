# CurateDS Mobile

Expo + React Native + TypeScript companion app for CurateDS. Auth0 PKCE login is wired; API integration arrives in Phase 1.

See [`app-plan/curateds-mobile-plan/`](../../app-plan/curateds-mobile-plan/) for the full plan.

## First-time setup

From the **repo root** (not this folder):

```powershell
npm install
```

This installs mobile dependencies via the npm workspace.

### Auth0 configuration

The mobile app needs its own **native** Auth0 application registration on the existing CurateDS tenant. The web SPA client cannot be reused.

In the Auth0 dashboard, create a new **Native** application and configure:

- **Allowed Callback URLs**: `curateds://redirect`, `exp://127.0.0.1:8081/--/redirect` (Expo Go dev)
- **Allowed Logout URLs**: same as above
- **Token Endpoint Authentication Method**: None (PKCE)
- **Refresh Token Rotation**: enabled
- **Refresh Token Behavior**: Rotating, with absolute lifetime
- **Grant Types**: Authorization Code, Refresh Token
- **Application API Audience**: the same `audience` the web app uses

Then copy `.env.example` to `.env` in `apps/mobile/` and fill in the three values:

```text
EXPO_PUBLIC_AUTH0_DOMAIN=...
EXPO_PUBLIC_AUTH0_CLIENT_ID=...
EXPO_PUBLIC_AUTH0_AUDIENCE=...
```

`.env` is gitignored. CI/EAS builds inject these values via build-profile environment variables instead.

## Run it on your phone (recommended first taste)

You don't need Xcode or Android Studio for the first run. Use Expo Go.

1. Install **Expo Go** from the App Store (iOS) or Play Store (Android).
2. From this folder:

    ```powershell
    npm run start
    ```

3. A QR code appears in the terminal. Scan it with your phone:
    - **iOS**: open the Camera app, point at the QR code, tap the notification.
    - **Android**: open Expo Go, tap "Scan QR code".
4. The app boots on your phone, connected to your dev machine over Wi-Fi. Edit `App.tsx` and save — the app reloads automatically.

If your phone and laptop are on different networks (corporate Wi-Fi often blocks this), press `s` in the Expo CLI to switch to Tunnel mode. Slower, but works through any network.

## Run it in a simulator (optional)

- **iOS** requires macOS with Xcode installed. Press `i` in the Expo CLI.
- **Android** requires Android Studio with at least one virtual device created. Press `a` in the Expo CLI.

For now, the phone+Expo Go path is faster to set up.

## Scripts

| Command | What it does |
|---|---|
| `npm run start` | Start the Expo dev server (QR code, hot reload) |
| `npm run ios` | Start and open in iOS simulator (macOS only) |
| `npm run android` | Start and open in Android emulator |
| `npm run web` | Start in a browser (limited; phone is more representative) |
| `npm run typecheck` | TypeScript compile check, no emit |
| `npm run test` | Jest with `jest-expo` preset |

## Project structure

```text
apps/mobile/
  App.tsx              # Root — gates between SignInScreen and HomeScreen on auth state
  app.config.ts        # Expo config (reads Auth0 env vars into expo.extra.auth0)
  app.json             # Expo native config (name, bundle id, splash, etc.)
  index.ts             # Expo entry point
  package.json         # Workspace package, scripts, deps
  tsconfig.json        # Extends expo/tsconfig.base, strict mode on
  src/
    auth/              # Auth0 PKCE client, secure-store wrapper, AuthContext + useAuth hook
    screens/           # SignInScreen, HomeScreen
  __tests__/           # Jest tests (auth/, App.test.tsx)
  assets/              # Icons, splash images
```

## What's intentionally not here yet

- **Navigation library** — added when the app has more than two screens.
- **API client / TanStack Query** — added with the first read-only collections list (Phase 1).
- **EAS Build, TestFlight, Play Store** — happens when there's a real build to ship.
- **ESLint** — added once the codebase is large enough to warrant it. Right now `tsc --strict` carries the load.

See [`02-mobile-feature-roadmap.md`](../../app-plan/curateds-mobile-plan/02-mobile-feature-roadmap.md) for the full phased plan.

## CI

A `mobile` job in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs `typecheck` and `test` on PRs that touch `apps/mobile/**`. PRs that don't touch this folder skip the job.

## Troubleshooting

**"Unable to resolve module"**: stop the Expo CLI, then `npm install` from the repo root again.

**Phone shows "Network response timed out"**: switch to Tunnel mode (`s` in the CLI). Often a Wi-Fi isolation issue.

**Metro bundler crashes on startup**: delete `apps/mobile/.expo/` and `node_modules/`, then reinstall from the repo root.
