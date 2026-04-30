# Mobile Quality And Engineering

This document is the mobile counterpart to [03-quality-and-engineering.md](../03-quality-and-engineering.md). It applies the same TDD-first principles to a React Native context.

## Test Strategy

Mobile follows the same test-first discipline the rest of the repo enforces (see [.github/copilot-instructions.md](../../.github/copilot-instructions.md)). Every PR that adds or modifies behavior must include tests for that behavior.

### Layers

- **Unit tests** — pure logic, hooks, store reducers, sync-queue state machine, validation mirrors. Jest with the Expo preset (Vitest's RN story is still immature). Aim: fast (<5s suite), no native dependencies.
- **Component tests** — React Native Testing Library for screens and components. Mock TanStack Query and navigation. Cover happy path plus every error/empty/loading branch a user can see.
- **API contract tests** — typed schema (Zod or generated from OpenAPI) tested against fixture responses captured from the real API. Catches drift between mobile assumptions and the actual backend response shape.
- **End-to-end (manual + scripted)** — a small Detox or Maestro flow exercising the critical capture path: launch → sign in → add item with photo → verify on web. Decision between Detox and Maestro is deferred to project init. E2E runs locally and on EAS preview, not on every PR.

### Coverage Expectations

- All happy-path mutations have a component test that includes the optimistic-update behavior.
- All Problem Details error shapes the API can return are covered with a test that asserts the user-facing surface for that `code`.
- Sync queue: every state transition and every retry/conflict branch has a unit test.
- Auth flow: token refresh, expired token, revoked token — all covered.

## Tooling Conventions

- ESLint and Prettier configs extend whatever the web app uses, adjusted only for React Native specifics.
- TypeScript `strict` on. No `any` in checked-in code.
- Conventional commits, branch naming, PR-only merges into `develop` — same workflow as the rest of the repo.
- Feature branches off `develop`. Never off `main`.

## CI Integration

The repo currently has two required CI status checks: `backend` and `frontend`. Mobile adds a third.

- New job `mobile` in [.github/workflows/ci.yml](../../.github/workflows/ci.yml):
    - `npm install` in `apps/mobile/`
    - `npm run typecheck`
    - `npm run lint`
    - `npm run test`
- The `mobile` job is a required check on PRs that touch `apps/mobile/`. PRs that don't touch mobile skip it via path filter.
- EAS builds for `develop` produce a preview build automatically. EAS builds for `main` produce a production submission candidate.

## Release Process

- iOS: EAS Build → TestFlight → App Store. Internal TestFlight group for staging users.
- Android: EAS Build → internal track → production track on Google Play.
- Version numbers track the API: when the backend introduces a breaking change, the mobile minimum-supported-version bumps.
- The app exposes `Settings → About` showing app version, build number, and the API base URL it's pointing at.

## Compatibility Policy

- Minimum supported iOS: matches Expo SDK's current floor.
- Minimum supported Android: matches Expo SDK's current floor (currently API 24 / Android 7.0).
- The app does not attempt to support older devices via polyfills. If the floor rises, older devices are gracefully end-of-lifed with an in-app message and a link to the web app.

## Observability

- Sentry for unhandled errors, crashes, and JS exceptions. Same DSN strategy as web (separate Sentry project).
- Each app launch logs a structured event to the API (via a lightweight `/telemetry` endpoint to be added when telemetry is needed; not part of MVP). Until that exists, Sentry breadcrumbs cover the same need.
- Outgoing requests carry `X-Correlation-ID` so failures correlate with API logs in Seq.
- The sync queue's failure surface is itself a piece of UX: the user can always see what failed and why, in plain language, and try again.

## Performance Budgets

- Cold start to interactive collection list (cached): under 2 seconds on a mid-range Android device.
- Camera screen open: under 1 second from tap to viewfinder.
- Photo capture to "saved" toast: under 2 seconds (excluding upload time).
- Items grid scroll: 60 fps with 1000 cached items, lazy image load.

These are targets, not gates. They become gates when measured regressions appear.

## Anti-Patterns To Avoid

- Re-implementing business rules client-side beyond what's needed for offline write queueing. The server is the source of truth.
- Bypassing the existing API to read directly from the database or storage. Never.
- Adding mobile-only fields to entities. If a field is needed, it goes through the backend domain model first.
- Storing access tokens in AsyncStorage. Always SecureStore.
- Generating media URLs client-side. The server returns them.
