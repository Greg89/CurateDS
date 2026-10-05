# V2 beta replacement and acceptance

Decision (2026-10-04): replace the original client on the existing beta web service and domain. Keep one deployed web application per environment. Beta follows `develop`; `main` and production are outside this cutover. The previous proposal for a second V2 service is superseded.

## Deployment contract

- `apps/web/Dockerfile` is the single web deployment recipe. It builds the Next.js workspace in `apps/web-v2`, runs as the non-root Node user, and honors runtime `PORT` (default 8080). The old Vite source remains a regression/reference workspace; it is absent from the runtime image. There is no second web service to provision.
- The existing beta web service keeps its domain and repository-root build context. Select `/apps/web/railway.toml`, or verify the existing settings resolve to `apps/web/Dockerfile` and health path `/health`. Remove nginx/static-site start-command overrides. Watch paths must include `/apps/web-v2/**`, `/apps/web/Dockerfile`, root package manifests, and the selected configuration; an old `/apps/web/**`-only filter will miss V2 changes.
- `/health` is an uncached, session-free readiness route. It returns 503 when required runtime settings are absent/invalid or the configured API health request fails, otherwise 200 with `application: curateds-web-v2`. It does not prove Auth0 credentials, grants, or storage policy are correct. Configure Railway to use it before switching the image. Railway uses readiness to decide when a new deployment can receive traffic; see [healthchecks](https://docs.railway.com/deployments/healthchecks).
- Old collection `/overview`, `/items`, and `/reports` bookmarks temporarily redirect to V2 overview, browse, and Insights, preserving query parameters. Existing SPA local-storage tokens do not become a V2 session; users sign in again.

## Before the beta push

Record the beta project/environment/web-service identity, public web/API origins, current successful deployment/image, current nonsecret service settings, and the API migration/backup status. Verify that this is the beta environment, not production. Keep the existing DB and storage volumes. The backend migrations are additive, but local test databases do not substitute for reviewing the beta dataset and backup.

Set these **server runtime** variables on the existing beta web service without putting secrets in Git or chat:

| Variable              | Value                                                                            |
| --------------------- | -------------------------------------------------------------------------------- |
| `APP_BASE_URL`        | Exact existing beta HTTPS web origin, without a path                             |
| `API_BASE_URL`        | Beta API origin reachable from the web container; private networking is suitable |
| `AUTH0_DOMAIN`        | Intended tenant                                                                  |
| `AUTH0_CLIENT_ID`     | Auth0 Regular Web Application, not the original SPA client                       |
| `AUTH0_CLIENT_SECRET` | That application's secret                                                        |
| `AUTH0_SECRET`        | New stable 32-byte secret encoded as 64 hexadecimal characters                   |
| `AUTH0_AUDIENCE`      | Identifier accepted by the beta API                                              |

Register `<beta-origin>/auth/callback` and the exact beta origin as the logout return URL on that Regular Web Application. Enable its refresh-token grant and the API's offline access. Remove obsolete `VITE_*` web build settings after recording the previous deployment's recovery configuration. Do not change the API audience merely because the web client changed.

Keep `Publication:Enabled=false` for the initial client cutover. Before testing publication, execute the private-storage and rate-limit prerequisites in [the rollout checklist](19-v2-publication-rollout-checklist.md). Owner image reads must work against existing objects; a missing object is not proof of private storage. Do not restore anonymous bucket reads during recovery.

## Local regression gate

1. Full .NET solution tests, plus the PostgreSQL runner for migration, transaction rollback, and publication races.
2. Opt-in local MinIO acceptance in an isolated bucket: upload, primary image, edit/delete, original-read denial, private derivatives, publication and revocation.
3. V2 unit/component tests and the legacy reference build/tests.
4. Build the exact deployment image and run the desktop/mobile browser suite against it:

```powershell
docker build -f apps/web/Dockerfile -t curateds-web-beta-regression .
$env:PLAYWRIGHT_DOCKER_IMAGE='curateds-web-beta-regression'
$env:PLAYWRIGHT_CHANNEL='msedge' # use installed Edge on Windows
npm run test:e2e
```

Docker browser tests mount fixture modules read-only and use synthetic Auth0 sessions, a disposable fixture API, and loopback ports 3101/3102. They run the production server, Linux runtime dependencies, packaged fonts, card rendering, and actual client assets from the deployable image. Fixture files and authentication transport are not part of the production runtime image. They do not access beta or local application data. CI runs the same image suite.

## Hosted smoke and regression

After CI and the beta deployment succeed, record the deployed commit and run:

```powershell
node apps/web-v2/scripts/check-deployment.mjs --origin https://BETA-WEB-ORIGIN
```

This is read-only: V2 readiness/API connectivity, landing and JavaScript assets, anonymous API denial, protected route redirect, Auth0 callback origin/PKCE, missing public showcase no-store/metadata boundaries, and the showcase stylesheet. It neither completes sign-in nor publishes content.

Use a real beta account and a clearly named disposable acceptance collection for the following matrix. Read existing collections first to check migration compatibility; make test edits only to the disposable records. Never use fixture cookies against beta.

| Area              | Hosted acceptance                                                                                                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication    | Sign in, callback, reload, real expiry/refresh, sign out, back-button/protected API denial, sign in again. Check cookie security and no client-side bearer endpoint. The existing accelerated live-auth script is local-only; hosted refresh must be observed with a real expiring session. |
| Existing data     | Correct owned collection list and counts, identity, images, existing custom fields, saved views, foreign-owner denial, old bookmarked routes.                                                                                                                                               |
| First use         | Create collection, first item, required fields, navigation/context after switching collections.                                                                                                                                                                                             |
| Browse and edit   | Search/filter/sort/page/history, grid/list, create/edit/remove test items, required typed fields, draft preservation after a failed request.                                                                                                                                                |
| Images            | Upload supported image, view after reload, change primary, remove; original and derivative URLs denied anonymously where required.                                                                                                                                                          |
| Insights          | Counts, growth, activity, grouping and exact drill-through, save/restore/remove a view.                                                                                                                                                                                                     |
| Settings          | Identity/theme, pins/order, section visibility, vocabulary and custom-field create/edit/remove on disposable records.                                                                                                                                                                       |
| Private showcase  | Gallery/Journal, optional reports, empty sections and private image display. No accidental public edition.                                                                                                                                                                                  |
| Public sharing    | After storage/edge readiness: prepare exact card/edition, publish/update/unpublish, old revision denial, source removal suspension, bots and signed-in visitors. Run the active/revoked edge checker for every resource.                                                                    |
| Responsive/errors | Desktop and mobile widths, keyboard navigation/focus, loading/empty/error/retry, API outage recovery, no horizontal overflow.                                                                                                                                                               |

Known beta scope gap: account-wide tag/location management and item-type creation still exist only in the legacy source. V2 can select existing values; replacing the hosted client removes those legacy management screens from beta. This is not full feature parity and remains follow-up work before a production promotion. Do not mark the matrix as fully passed while any required workflow is unavailable.

## Recovery and acceptance record

If readiness or core sign-in/catalog/media acceptance fails, restore the recorded previous successful web deployment on the **same service and domain**, with its corresponding recorded configuration. Preserve database and storage volumes. Do not down-migrate or delete user data as a web rollback. Existing API private-media behavior is supported by the last legacy client code; verify its owner image display after rollback. If publication was enabled for testing, revoke test editions and disable publication first.

Record exact commits/image IDs, CI URL/status, Railway deployment IDs, tested origins/times, each matrix result, any failed cases, and disposition of disposable records. Local results belong here separately from hosted results. A successful build or landing page alone does not complete beta acceptance or Slice 6.

Local acceptance (2026-10-04):

- Backend: 380 passed in the default solution run; the separately enabled real-storage acceptance passed (1), and PostgreSQL migration/concurrency acceptance passed (43).
- Frontend: 151 V2 unit/component tests and 140 legacy reference tests passed; the legacy reference build passed.
- Linux web image built successfully, including TypeScript validation. All 72 desktop/mobile browser cases passed against it. Image ID: `sha256:c24520858e2be957eee380e0108b315fb9b75a83b80a9a68d3a0a509a3d1c080`.
- Runtime checks confirmed non-root execution, packaged fonts, absence of legacy source/fixtures/local secrets, and generic 503 readiness when configuration is missing. Compose validation passed. The local V2 dev server still reports healthy readiness.
- CI now runs PostgreSQL-backed infrastructure acceptance and browser flows against the web deployment image. Remote CI has not run for these unpushed changes.

Pending: the beta URL and connected Railway access are needed to verify service identity, runtime Auth0 settings, readiness/watch paths, and the recovery deployment. Changes have not been committed or pushed; no hosted service, storage policy, or user data was changed. Hosted sign-in, regression, edge/private-storage acceptance, and Slice 6 completion remain outstanding.

### Continuation check (2026-10-05)

GitHub's public deployment record identifies beta as Railway project `eda7c331-a1a5-4885-90ec-6b11f2d25e83`, environment `9ec45f12-7e4f-4328-9348-05f48c16dd5e`. This identifies the dashboard, not the public application URL or verified service settings.

The existing [CI run for committed develop at 3cb3bfb](https://github.com/Greg89/CurateDS/actions/runs/37246926017) failed in **Test V2 browser flows**. Backend, frontend builds, and both unit-test stages passed. Public check annotations do not include the browser failure details; authenticated log access is pending explicit user authorization. Do not assume the new Docker-backed local pass explains or resolves that remote failure.

No push or hosted mutation has occurred. Railway is not connected through an available integration, and browser automation could not initialize. The remaining inputs are authenticated CI-log access (or the failure output), the beta web URL, and access to verify/configure the existing beta service. Local regression results above remain valid; no implementation changes were made during this continuation.

### Pipeline navigation race (2026-10-05)

The replacement is now committed as `69c9301`. The user supplied the failed 72-case CI output: 71 cases passed, and the mobile Insights drill-through test switched the second collection to Browse instead of Insights. This resolves the earlier need for authenticated log access for this failure.

The test clicked Insights and immediately used the persistent collection switcher while client navigation could still be pending. The switcher intentionally preserves the current committed section, so its prior Browse handler could win that race. The regression now waits for both the Insights URL and its `aria-current="page"` navigation state before changing collection. The final destination and empty-Insights assertions remain intact; no sleeps, retries, or timeout increases were added, and application behavior is unchanged.

Validation passed against the unchanged Linux deployment image: 20 consecutive repetitions of the mobile Insights scenario, followed by all 72 desktop/mobile browser cases. Remote CI will rerun when this fix is pushed to `develop`. Beta runtime settings, its public URL, and hosted acceptance remain unverified.
