# CurateDS

CurateDS is a web-first, hobby-agnostic catalog platform for curating personal collections.

## Current Status

This repository currently contains:

- lightweight discovery docs in `docs/`
- implementation planning docs in `app-plan/`
- initial solution and project skeleton for API, domain, application, infrastructure, web, and tests

## Planned Architecture

- `src/Api` ASP.NET Core API
- `src/Application` application use cases and contracts
- `src/Domain` domain model and business rules
- `src/Infrastructure` EF Core, PostgreSQL, logging, and external adapters
- `src/Web` React web client

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
