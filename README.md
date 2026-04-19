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

## Test Layout

- `tests/Domain.UnitTests`
- `tests/Application.UnitTests`
- `tests/Infrastructure.IntegrationTests`
- `tests/Api.IntegrationTests`
- `tests/Web.UnitTests`
- `tests/EndToEndTests`

## Next Implementation Focus

The first vertical slice should cover:

1. creating a collection
2. defining a custom attribute
3. creating an item
4. viewing item detail
