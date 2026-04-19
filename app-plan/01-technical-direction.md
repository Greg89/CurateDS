# Technical Direction

## Recommended Stack

### Backend

- .NET 9
- ASP.NET Core Web API
- Entity Framework Core with PostgreSQL provider
- Serilog for structured logging
- FluentValidation for request validation
- MediatR-style application layer pattern only if it stays lightweight and useful

### Web Frontend

- React + TypeScript
- Vite for a lean web-first setup
- TanStack Router or React Router
- TanStack Query for server-state management
- Tailwind CSS or a small design token layer plus component primitives

### Database

- PostgreSQL on Railway

### Testing

- xUnit for backend tests
- FluentAssertions
- NSubstitute or Moq for focused unit tests
- Testcontainers for PostgreSQL-backed integration tests
- Vitest + React Testing Library for frontend unit/component tests
- Playwright for end-to-end vertical slice coverage

## Why This Direction Fits

This stack aligns especially well with your requirements:

- Serilog is a first-class citizen in ASP.NET Core.
- .NET supports strong domain modeling, testability, and layered architecture.
- PostgreSQL is a natural relational fit for mixed structured and semi-flexible metadata.
- Railway supports the deployment shape cleanly: web app, API, and PostgreSQL service.
- A separate API plus web frontend keeps the door open for a future mobile client without reworking core business logic.

## Solution Architecture

Use a single repository with separate projects:

```text
src/
  Api/
  Application/
  Domain/
  Infrastructure/
  Web/
tests/
  Domain.UnitTests/
  Application.UnitTests/
  Infrastructure.IntegrationTests/
  Api.IntegrationTests/
  Web.UnitTests/
  EndToEndTests/
```

## Layer Responsibilities

### Domain

- entities
- value objects
- domain services
- invariants
- domain events if needed

### Application

- use cases
- commands and queries
- DTO mapping
- validation coordination
- transaction boundaries via interfaces

### Infrastructure

- EF Core persistence
- PostgreSQL mappings
- media storage adapters
- Serilog wiring
- Railway-specific configuration glue

### API

- HTTP endpoints
- auth wiring later
- request/response contracts
- middleware and problem details

### Web

- screens
- forms
- table/filter UX
- client-side route orchestration

## Mobile Readiness

Do not build mobile now, but preserve future reuse by:

- keeping business rules out of the web app
- treating the API as the contract boundary
- versioning DTOs intentionally
- avoiding web-only assumptions in domain/application layers

Future mobile options:

- React Native / Expo using the same API
- MAUI only if you later want a full .NET client story

The lower-risk path from this starting point is React web now, React Native later.
