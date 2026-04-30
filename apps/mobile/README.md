# CurateDS Mobile

Expo + React Native + TypeScript companion app for CurateDS. Phase 0 scaffold — no auth, no API integration yet.

See [`app-plan/curateds-mobile-plan/`](../../app-plan/curateds-mobile-plan/) for the full plan.

## First-time setup

From the **repo root** (not this folder):

```powershell
npm install
```

This installs mobile dependencies via the npm workspace.

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
  App.tsx              # Root component — placeholder screen for now
  index.ts             # Expo entry point
  app.json             # Expo native config (name, bundle id, splash, etc.)
  package.json         # Workspace package, scripts, deps
  tsconfig.json        # Extends expo/tsconfig.base, strict mode on
  __tests__/           # Jest tests
  assets/              # Icons, splash images
```

## What's intentionally not here yet

- **Auth0** — comes in the next ticket. Requires a new Auth0 native application registration.
- **Navigation library** — added when the app has more than one screen.
- **API client / TanStack Query** — added with the first read-only collections list (Phase 1).
- **EAS Build, TestFlight, Play Store** — happens when there's a real build to ship.
- **ESLint** — added once the codebase is large enough to warrant it. Right now the placeholder is small enough that `tsc --strict` carries the load.

See [`02-mobile-feature-roadmap.md`](../../app-plan/curateds-mobile-plan/02-mobile-feature-roadmap.md) for the full phased plan.

## CI

A `mobile` job in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs `typecheck` and `test` on PRs that touch `apps/mobile/**`. PRs that don't touch this folder skip the job.

## Troubleshooting

**"Unable to resolve module"**: stop the Expo CLI, then `npm install` from the repo root again.

**Phone shows "Network response timed out"**: switch to Tunnel mode (`s` in the CLI). Often a Wi-Fi isolation issue.

**Metro bundler crashes on startup**: delete `apps/mobile/.expo/` and `node_modules/`, then reinstall from the repo root.
