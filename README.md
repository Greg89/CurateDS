# CurateDS

A web-first, hobby-agnostic catalog platform for curating personal collections.

Organise anything — books, vinyl, board games, tools — with custom attributes, tags, locations, and saved views. Built with a clean API-first architecture so a mobile client can follow later.

## Features

- **Multiple collections** — create separate catalogs for different hobbies or categories
- **Custom attribute definitions** — define typed fields (text, number, date, boolean, enum) per collection
- **Tags & locations** — organise items with reusable tags and physical locations
- **Filtering & search** — filter by search text, location, tags, or custom attribute values
- **Sorting & paging** — sort by name, quantity, created date, or last updated
- **Saved views** — persist a combination of filters and sort options per collection
- **Item detail & history** — view structured item detail and an activity event log
- **Secure by default** — Auth0 JWT authentication on every API endpoint

## Tech Stack

| Layer | Technology |
|---|---|
| API | .NET 9, ASP.NET Core minimal APIs |
| ORM | EF Core + Npgsql (PostgreSQL) |
| Frontend | React 19, Vite, TypeScript, React Router 7, TanStack Query |
| Auth | Auth0 |
| Logging | Serilog → console + Seq |
| Storage | S3-compatible object storage |
| Hosting | Railway (beta from `develop`, production from `main`) |

## Repository Structure

```
apps/
  api/          ASP.NET Core API
  web/          React web client
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

## Local Development

Requires Docker Desktop.

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| API | http://localhost:8080 |
| API health | http://localhost:8080/health |
| Seq (logs) | http://localhost:8081 |

The compose stack mirrors the Railway deployment shape — one Postgres service, one API service, one web service, and one Seq log aggregator. Configuration is environment-variable driven so local and hosted setups stay aligned.

## Running Tests

```bash
# Backend (all projects)
dotnet test CurateDS.sln

# Frontend unit tests
npm run test:web

# Frontend unit tests (watch mode)
npm run test:web:watch

# E2E (local only — requires the full stack running)
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

### Web (build-time)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | API base URL |
| `VITE_AUTH0_DOMAIN` | Auth0 tenant domain |
| `VITE_AUTH0_CLIENT_ID` | Auth0 SPA client ID |
| `VITE_AUTH0_AUDIENCE` | Auth0 API identifier |

## CI / CD

GitHub Actions runs two required checks on every PR — `backend` and `frontend`. Both must pass before a branch can be merged. Railway is configured to wait for CI before deploying.

- PRs into `develop` → deploy to **beta** on Railway after CI passes
- PRs into `main` → deploy to **production** on Railway after CI passes

## Contributing

1. Branch from `develop`: `feature/<short-description>`
2. Follow the TDD workflow — write the failing test first
3. Ensure `dotnet test CurateDS.sln` and `npm run test:web` are green
4. Open a PR into `develop`; CI must pass before merge
5. return to the remaining MVP features once the browsing path is scalable enough to support larger collections
