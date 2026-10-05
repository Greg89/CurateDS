# CurateDS

A web-first, hobby-agnostic catalog platform for curating personal collections.

Organise anything - books, vinyl, board games, tools - with custom attributes, tags, locations, and saved views. V2 is focused on a cleaner API and web experience before any additional clients are introduced.

## Features

- **Multiple collections** - create separate catalogs for different hobbies or categories
- **Custom attribute definitions** - define typed fields (text, number, date, boolean, enum) per collection
- **Tags & locations** - organise items with reusable tags and physical locations
- **Filtering & search** - filter by search text, location, tags, or custom attribute values
- **Sorting & paging** - sort by name, quantity, created date, or last updated
- **Saved views** - persist a combination of filters and sort options per collection
- **Item detail & history** - view structured item detail and an activity event log
- **Secure by default** - Auth0 JWT authentication on every API endpoint

## Tech Stack

| Layer | Technology |
|---|---|
| API | .NET 10, ASP.NET Core minimal APIs |
| ORM | EF Core + Npgsql (PostgreSQL) |
| Frontend | Next.js App Router, React 19, TypeScript, TanStack Query |
| Auth | Auth0 |
| Logging | Serilog -> console + Seq |
| Storage | S3-compatible object storage |
| Hosting | Railway (beta from `develop`, production from `main`) |

## Repository Structure

```
apps/
  api/          ASP.NET Core API
  web/          Web deployment Dockerfile and legacy reference source
  web-v2/       Primary Next.js web application
packages/
  domain/       Domain model and business rules
  application/  Use cases and service contracts
  infrastructure/  EF Core, PostgreSQL, storage, and logging adapters
tests/
  Domain.UnitTests/
  Application.UnitTests/
  Infrastructure.IntegrationTests/
  Api.IntegrationTests/
  Web.UnitTests/
  EndToEndTests/
```

## V2 Direction

CurateDS V2 keeps the existing core use case: a flexible personal catalog for real collections. The rewrite work should preserve useful backend/domain lessons while trimming unused surfaces and rebuilding the product experience around API and web only.

Current V2 boundaries:

- keep the .NET API, application, domain, and infrastructure projects as the backend foundation
- keep the React web app as the primary user experience
- remove inactive client surfaces and planning docs until the web product is strong enough to justify another app
- keep CI focused on backend and frontend checks
- avoid adding coverage, dependency-bot, or static-analysis services until they are worth their maintenance cost

### V2 foundation workspace

The primary Next.js application is in [`apps/web-v2`](apps/web-v2/README.md). The existing `apps/web/Dockerfile` deploys it to the existing web service; the Vite source is retained only as a regression reference. Beta replaces the original client in place, with one web service and the same domain. Run `npm run dev:web-v2` on Node 24.15+ for port 3001. See the [beta cutover and acceptance plan](docs/refactor/20-v2-beta-cutover.md) for runtime Auth0 configuration, hosted checks, and rollback.

## Local Development

Requires Docker Desktop. First run `npm ci --ignore-scripts` and `npm run setup:local --workspace @curateds/web-v2`, then fill in the Regular Web Application settings in `apps/web-v2/.env.local`. Compose uses those server credentials but overrides the web origin to `http://localhost:3000` and the API to its internal service address. Register `http://localhost:3000/auth/callback` and the matching logout origin in Auth0 for Docker; the standalone dev server continues to use port 3001.

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| API | http://localhost:8080 |
| API health | http://localhost:8080/health |
| Seq (logs) | http://localhost:8081 |

The compose stack mirrors the Railway deployment shape - one Postgres service, one API service, one web service, and one Seq log aggregator. Configuration is environment-variable driven so local and hosted setups stay aligned.

## Running Tests

```bash
# Backend (all projects)
dotnet test CurateDS.sln

# Frontend unit tests
npm run test:web

# Frontend unit tests (watch mode)
npm run test:web:watch

# Production browser fixtures (build first; no application data is changed)
npm run test:e2e
```

## Environment Variables

### API

| Variable | Description |
|---|---|
| `Auth0__Domain` | Auth0 tenant domain |
| `Auth0__Audience` | Auth0 API identifier |
| `ConnectionStrings__CatalogDb` | PostgreSQL connection string |
| `Cors__AllowedOrigins__0` | Allowed CORS origin (web app URL) |
| `Serilog__SeqUrl` | Optional Seq ingestion endpoint |

### Web (server runtime)

| Variable | Description |
|---|---|
| `APP_BASE_URL` | Exact beta HTTPS origin; canonical URLs and Auth0 callback origin |
| `API_BASE_URL` | API origin reachable by the web server |
| `AUTH0_DOMAIN` | Auth0 tenant |
| `AUTH0_CLIENT_ID` | Regular Web Application client ID |
| `AUTH0_CLIENT_SECRET` | Its client secret |
| `AUTH0_SECRET` | Stable 64-character hexadecimal session secret |
| `AUTH0_AUDIENCE` | Existing API identifier |

These are server-only variables. Old `VITE_*` values no longer configure the deployed web app. Use `/health` for readiness and `/apps/web/railway.toml` on the existing web service. See the cutover plan before pushing the replacement to beta.

## CI / CD

GitHub Actions runs two required checks on every PR - `backend` and `frontend`. Both must pass before a branch can be merged. Frontend checks build/test V2 and the legacy reference, then exercise V2 desktop/mobile flows against the deployment Docker image. Railway is configured to wait for CI before deploying; verify that setting on beta during cutover.

- PRs into `develop` -> deploy to **beta** on Railway after CI passes
- PRs into `main` -> deploy to **production** on Railway after CI passes

## Contributing

1. Branch from `develop`: `feature/<short-description>`
2. Follow the TDD workflow - write the failing test first
3. Ensure `dotnet test CurateDS.sln` and `npm run test:web` are green
4. Open a PR into `develop`; CI must pass before merge
5. Keep V2 changes scoped to the API and web foundation unless the product direction changes deliberately
