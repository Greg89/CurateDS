# CurateDS

CurateDS is a web-first, hobby-agnostic catalog platform for curating personal collections.

## Current Status

This repository currently contains:

- lightweight discovery docs in `docs/`
- implementation planning docs in `app-plan/`
- an app/package repo skeleton for API, web, backend packages, and tests

## Planned Architecture

- `apps/api` ASP.NET Core API
- `apps/web` React web client
- `packages/application` application use cases and contracts
- `packages/domain` domain model and business rules
- `packages/infrastructure` EF Core, PostgreSQL, logging, and external adapters

## Local Development

For local containerized development:

1. Run `docker compose up --build`
2. Open the web app at `http://localhost:3000`
3. Open the API at `http://localhost:8080`
4. Check API health at `http://localhost:8080/health`
5. Open Seq at `http://localhost:8081`

The compose stack is designed to resemble the Railway deployment shape:

- one Seq log service
- one PostgreSQL service
- one API service
- one web service

The web app is built with a configurable `VITE_API_BASE_URL`, while the API gets its database connection and optional Seq sink settings from environment variables, which keeps local and hosted configuration patterns aligned.

## Local Logging

The API always logs to console and can optionally forward structured events to Seq.

In Docker Compose, Seq is available locally:

- UI: `http://localhost:8081`
- ingestion endpoint: `http://localhost:5341`

The local compose setup starts Seq without authentication for convenience. For Railway or any shared environment, you should switch that to a proper admin password or managed access model.

## Test Layout

- `tests/Domain.UnitTests`
- `tests/Application.UnitTests`
- `tests/Infrastructure.IntegrationTests`
- `tests/Api.IntegrationTests`
- `tests/Web.UnitTests`
- `tests/EndToEndTests`

## Client Testing

The web client now supports a layered TDD workflow:

- `npm run test:web` runs fast client-side tests with Vitest, Testing Library, jsdom, and MSW
- `npm run test:web:watch` starts the watch-mode loop for frontend TDD
- `npm run test:e2e` runs the Playwright browser smoke tests

Use the web unit tests for most client behavior and routing changes, and keep Playwright focused on a small number of critical real-browser flows.

## Next Implementation Focus

The current vertical slice covers:

1. creating a collection
2. listing collections
3. navigating a routed collection workspace with overview, items, and settings screens
4. defining custom attribute definitions per collection
5. creating items with typed custom attribute values
6. listing items for a collection
7. viewing item detail
8. editing items after creation
9. organizing items with reusable tags and locations
10. filtering a collection's items by search text, location, and tags
11. filtering item lists by custom attribute values
12. sorting item lists by updated date, created date, name, or quantity
13. saving collection-specific item views in the web app for reuse

The original MVP slice still has these notable gaps:

1. denser list or table browsing for larger collections
2. media metadata or attachments
3. item history or activity tracking
4. dashboard and reporting views above the collection workspace

The next roadmap changes are:

1. refactor item listing so search, filter, and sort execute in the repository/EF query instead of in memory
2. add a paged item-list contract and UI flow on top of that query refactor
3. continue tightening API contracts with the same Problem Details strategy and paged DTO consistency
4. keep decomposing the routed client into smaller reusable feature components and hooks
5. return to the remaining MVP features once the browsing path is scalable enough to support larger collections
