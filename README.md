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

## Next Implementation Focus

The current vertical slice covers:

1. creating a collection
2. listing collections

The next vertical slice should cover:

1. defining a custom attribute
2. creating an item
3. viewing item detail
