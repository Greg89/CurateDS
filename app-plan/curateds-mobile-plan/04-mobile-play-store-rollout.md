# Mobile Play Store Rollout

Concrete, ordered plan for getting the Android app into the Google Play Store. Covers every code change, service prerequisite, CI/CD addition, and manual console step required. Follow these sections in order — later steps depend on earlier ones.

**Scope**: Android only. iOS (TestFlight → App Store) is the same principle but different tooling; that plan is deferred.

---

## 1. Prerequisites (Do First, No Code)

These must exist before any build or submission can succeed.

### 1.1 Google Play Developer Account

- Sign up at [play.google.com/console](https://play.google.com/console). One-time $25 USD registration fee.
- The account email should be an organisation-level account, not a personal Gmail, so access can be shared.

### 1.2 Play Console App Registration

- In Play Console: **Create app** → name "CurateDS", category, and declare it is not primarily for children.
- Set package name: `com.curateds.mobile` — this must match `defaultConfig.applicationId` in `apps/mobile/android/app/build.gradle` and `android.package` in `apps/mobile/app.json`. Both already read `com.curateds.mobile`; do not change them.
- Fill out the **Store listing** (required before any review): short description, full description, screenshots for phone. Screenshots can be taken from a local debug build; they don't need to be from a signed release.
- Upload a **Privacy Policy URL**. Play requires this for any app that uses authentication, camera, or photo access. A minimal policy hosted on the CurateDS web domain is sufficient. It must disclose what data is collected and how Auth0 is used.
- Complete the **Content rating questionnaire** and the **App access** form (Play will ask how reviewers should log in; use a test account, not real credentials).
- No upload is needed yet; this is just console configuration.

### 1.3 Expo Account

- Create an account at [expo.dev](https://expo.dev).
- Create a project: organisation `curateds`, project name `curateds-mobile`. Note the project `slug` — it must match `apps/mobile/app.json`'s `"slug": "curateds-mobile"`.
- Install EAS CLI globally: `npm install -g eas-cli`.
- Log in: `eas login`.

### 1.4 Auth0 Native Application Registration

The existing Auth0 SPA client (used by the web app) cannot be reused for native. PKCE works differently in native context and the allowed callback URLs differ.

- In the Auth0 dashboard, create a new application: type **Native**.
- Note the new `clientId` — this is `EXPO_PUBLIC_AUTH0_CLIENT_ID` for the mobile build profiles.
- Add allowed callback URLs:
  ```
  curateds://auth0
  ```
  The exact value is derived from the Expo `scheme` in `app.json` (`"scheme": "curateds"`) and how `expo-auth-session` constructs the redirect URI. Verify by logging `AuthSession.makeRedirectUri()` from a debug build against staging; adjust if needed.
- Add allowed logout URLs:
  ```
  curateds://auth0
  ```
- All other settings (audience, scopes) are identical to the web SPA client.

---

## 2. Code Changes

### 2.1 Replace Placeholder Assets

The files in `apps/mobile/assets/` are Expo's defaults. The Play Store will reject a submission whose icon matches the Expo logo.

| File | Required size | Notes |
|---|---|---|
| `icon.png` | 1024×1024 px | Square, no rounded corners (the OS applies the shape mask) |
| `adaptive-icon.png` | 1024×1024 px | Foreground layer only; keep subject in the centre 66% safe zone. Background colour is `#ffffff` as set in `app.json`. |
| `splash-icon.png` | At minimum 200×200 px | Displayed on a white background; keep it centred |
| `favicon.png` | 48×48 px | Web only; low priority |

These are pure file replacements; no code changes needed.

### 2.2 Add `eas.json`

Create `apps/mobile/eas.json`. EAS Build reads this to know how to build each profile; EAS Submit reads it to know how to upload.

```json
{
  "cli": {
    "version": ">= 16.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://your-staging-api-url",
        "EXPO_PUBLIC_AUTH0_DOMAIN": "your-tenant.us.auth0.com",
        "EXPO_PUBLIC_AUTH0_CLIENT_ID": "your-native-client-id-staging",
        "EXPO_PUBLIC_AUTH0_AUDIENCE": "https://api.curateds.example"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "credentialsSource": "remote",
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://your-prod-api-url",
        "EXPO_PUBLIC_AUTH0_DOMAIN": "your-tenant.us.auth0.com",
        "EXPO_PUBLIC_AUTH0_CLIENT_ID": "your-native-client-id-prod",
        "EXPO_PUBLIC_AUTH0_AUDIENCE": "https://api.curateds.example"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "internal"
      }
    }
  }
}
```

Replace all placeholder values with real ones. The `env` block bakes environment variables into the build at EAS build time — these are not runtime secrets, they are embedded in the bundle. Do not put anything in `env` that cannot be in the APK.

The `credentialsSource: "remote"` setting tells EAS to manage the Android keystore on its servers. EAS generates it on the first production build and stores it in your Expo account. This is the correct approach — do not generate or manage a keystore manually unless you have a specific reason to.

### 2.3 Fix the Release Signing Config in `build.gradle`

`apps/mobile/android/app/build.gradle` currently has the `release` build type pointing at `signingConfig signingConfigs.debug`. That must be changed to use the EAS-managed keystore in CI, or a `keystore.properties` file locally.

Because EAS manages the keystore remotely and injects it during the cloud build, the simplest correct approach is to remove the incorrect `signingConfig signingConfigs.debug` line from the `release` block and let EAS handle injection. The release block becomes:

```groovy
release {
    def enableShrinkResources = findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: 'false'
    shrinkResources enableShrinkResources.toBoolean()
    minifyEnabled enableMinifyInReleaseBuilds
    proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
}
```

EAS Build injects the signing configuration automatically for production builds when `credentialsSource` is `"remote"`.

### 2.4 Enable Automatic Version Code Incrementing

In `apps/mobile/app.json`, the `android` block does not currently include a `versionCode`. Every Play Store upload requires a strictly incrementing `versionCode`. Add this to `eas.json` under the production android profile to let EAS manage it:

```json
"android": {
  "buildType": "app-bundle",
  "autoIncrement": true
}
```

EAS queries the Play Store API for the current highest `versionCode` and increments it automatically. This requires the `google-play-key.json` service account to be configured first (see section 3).

### 2.5 Add `expo-camera` and `expo-image-picker` Permissions to `app.json`

The Play Store requires declared permissions to match what the app uses. Add to the `android` block in `app.json`:

```json
"permissions": [
  "android.permission.CAMERA",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.INTERNET"
]
```

`expo-camera` and `expo-image-picker` add these automatically via their Expo config plugins, but declaring them explicitly keeps the manifest auditable.

### 2.6 Add EAS Project ID to `app.json`

After running `eas build:configure` (section 3.1), EAS will inject `"projectId"` into `app.json` under `extra.eas`. Commit this change — it ties the local project to the Expo account's project record and is required for OTA updates later.

---

## 3. EAS Setup Commands

Run these from `apps/mobile/`.

### 3.1 Link the project to Expo

```bash
eas build:configure
```

This creates or updates `eas.json` with the `projectId` and sets up the project on expo.dev. Commit the resulting changes to `app.json`.

### 3.2 Set up Android credentials (first production build only)

```bash
eas credentials
```

Select Android → production. Choose "Let EAS handle this for me." EAS generates a keystore, stores it remotely, and associates it with the `com.curateds.mobile` app ID. **Download a backup of this keystore** from expo.dev and store it securely (e.g. 1Password). Losing the keystore means you can never update the app on Play Store.

### 3.3 Trigger a production build

```bash
eas build --platform android --profile production
```

EAS queues the build on Expo's servers, applies the remote keystore, and produces a signed `.aab`. The build URL is printed to stdout; the artifact is also available at expo.dev.

### 3.4 Submit to Play Store (internal track)

```bash
eas submit --platform android --profile production
```

This requires the `google-play-key.json` Google service account key (see section 4). On first run it will prompt for it. The `.aab` from the most recent production build is submitted to the internal testing track.

---

## 4. Google Play Service Account Key

EAS Submit and `autoIncrement` both need API access to Play Console.

1. In Google Cloud Console (linked to your Play account), create a service account.
2. Grant it the role **Release Manager** in Play Console under **Users and permissions → Service accounts**.
3. Download the JSON key file.
4. Place it at `apps/mobile/google-play-key.json`.
5. Add `google-play-key.json` to `apps/mobile/.gitignore` — this file is a secret and must never be committed.
6. For CI, store the contents as a GitHub Actions secret named `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.

---

## 5. CI/CD: `mobile-release.yml`

The existing `ci.yml` mobile job covers typecheck, lint, and tests — that does not change. A separate workflow handles release builds. Release builds are not triggered on every PR; they are triggered either manually or by a tag.

Create `.github/workflows/mobile-release.yml`:

```yaml
name: mobile-release

on:
  push:
    tags:
      - 'mobile/v*'       # e.g. git tag mobile/v1.0.0 && git push --tags
  workflow_dispatch:      # manual trigger from GitHub UI
    inputs:
      profile:
        description: 'EAS build profile'
        required: true
        default: 'production'
        type: choice
        options:
          - production
          - preview

permissions: {}

jobs:
  build-and-submit:
    name: Build & Submit Android
    runs-on: ubuntu-latest

    permissions:
      contents: read

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Write Google Play service account key
        run: echo '${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON }}' > apps/mobile/google-play-key.json

      - name: Build Android
        working-directory: apps/mobile
        run: eas build --platform android --profile ${{ inputs.profile || 'production' }} --non-interactive

      - name: Submit to Play Store
        if: ${{ (inputs.profile || 'production') == 'production' }}
        working-directory: apps/mobile
        run: eas submit --platform android --profile production --non-interactive

      - name: Clean up service account key
        if: always()
        run: rm -f apps/mobile/google-play-key.json
```

Add to GitHub repository secrets:
| Secret | Value |
|---|---|
| `EXPO_TOKEN` | Personal access token from expo.dev → Account Settings → Access Tokens |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Full contents of `google-play-key.json` |

---

## 6. Play Console: Internal Testing Track

Once the first AAB is submitted:

1. In Play Console, go to **Testing → Internal testing**.
2. Create a release. The submitted AAB appears automatically.
3. Add testers: go to **Testers** tab, create a list, add Google account email addresses (including your own).
4. Copy the **opt-in URL** and open it from the test device. Install via the Play Store app (not sideloading).

Internal testing requires no Google review. Builds are available to testers within minutes of submission.

---

## 7. Railway

Railway does not change. Railway deploys:
- The .NET API (from `apps/api/`) — Docker build, deployed on push to `develop` (beta) and `main` (production).
- The web React app (from `apps/web/`) — Docker build, same promotion model.

The mobile app is a native binary distributed through the Play Store. It talks to the Railway-hosted API over HTTPS. The connection between mobile and Railway is `EXPO_PUBLIC_API_BASE_URL` set in `eas.json` build profiles — staging points at the beta Railway service, production points at the production Railway service. Nothing in `railway.toml` needs to change.

---

## 8. Rollout Sequence

In order:

1. **Complete Play Console setup** (section 1.2): store listing, privacy policy, content rating, app access.
2. **Register Auth0 native app** (section 1.4) and note the new `clientId`.
3. **Replace assets** (section 2.1).
4. **Create `eas.json`** (section 2.2) with real env values filled in.
5. **Fix `build.gradle` release signing** (section 2.3).
6. **Run `eas build:configure`** from `apps/mobile/` (section 3.1) and commit changes.
7. **Run `eas credentials`** to generate the remote keystore (section 3.2) and back it up.
8. **Create `mobile-release.yml`** in `.github/workflows/` (section 5).
9. **Add GitHub secrets** (`EXPO_TOKEN`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`) (section 5).
10. **Trigger first build manually** from GitHub Actions or `eas build --platform android --profile production`.
11. **Submit to internal track** and install on test device.
12. Verify sign-in, API connectivity, and core flows on a real device.
13. Promote to **closed testing** or **open testing** when stable.

---

## 9. What Is Not In This Doc

- **iOS rollout** — same EAS Build + EAS Submit pattern but requires an Apple Developer account ($99/yr), provisioning profiles, and TestFlight. Deferred.
- **OTA updates** — EAS Update allows JS bundle patches without a full Play Store submission. Not needed for the initial rollout but worth adding once the app is live.
- **Staged rollout** — once out of internal testing, Play Console supports rolling out to a percentage of users. Use this before going 100%.
- **Play Store review timelines** — internal testing bypasses review. Moving to production (even 1% rollout) triggers a Google review that typically takes 1–3 business days for a new app.
