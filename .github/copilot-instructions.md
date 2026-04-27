# CurateDS Project Guidelines

## Branch Workflow

**Always create a feature branch before making any code changes.**

- Branch from `develop`, never from `main`
- Name pattern: `feature/<short-description>` (e.g. `feature/add-location-filter`)
- Never commit directly to `develop` or `main` — both are branch-protected and require a passing CI run via PR

## Tech Stack

- **Backend**: .NET 9, ASP.NET Core minimal APIs, EF Core + Npgsql (PostgreSQL), Serilog
- **Frontend**: React 19, Vite, TypeScript, React Router 7, TanStack Query, Auth0
- **Tests**: xUnit + FluentAssertions (backend), Vitest + Testing Library (web unit), Playwright (E2E — local only)
- **Database**: PostgreSQL in production; EF Core InMemory in integration tests

## TDD Workflow

**Follow a test-first approach for all new behaviour.**

1. **Write a failing test first** — before writing any implementation code, write a test that captures the expected behaviour and confirm it fails
2. **Write the minimum code to make it pass** — no speculative code; only what the test requires
3. **Refactor** — clean up with the tests still green

Every PR should include tests for the behaviour it introduces or changes. A PR that adds or modifies logic without accompanying tests should be considered incomplete.

### What to test

- **Domain logic** → `Domain.UnitTests` (pure unit tests, no infrastructure)
- **Application services** → `Application.UnitTests` (mock repositories and services)
- **API endpoints + full request pipeline** → `Api.IntegrationTests` (uses InMemory DB via `CollectionApiFactory`)
- **React components and hooks** → `Web.UnitTests` (Vitest + Testing Library + MSW)

### Coverage expectations

- All happy-path flows must have a test
- All validation and error paths (400, 404, 409, etc.) must have a test
- Edge cases and boundary conditions should be covered where the logic is non-trivial

## Testing Conventions

- Integration tests use an InMemory database — avoid EF Core constructs that require a real SQL engine:
  - **No** `EF.Functions.ILike` — use `.ToLower().Contains()` instead
  - **No** `ExecuteDeleteAsync` / `ExecuteUpdateAsync` — use change-tracking (`RemoveRange`, entity method calls) instead
- Run all tests before opening a PR: `dotnet test CurateDS.sln` and `npm run test:web`

## CI

- Two required status checks: `backend` and `frontend` (defined in `.github/workflows/ci.yml`)
- Both must pass before any merge into `develop` or `main`
- Railway deployments are gated on CI: beta deploys from `develop`, production deploys from `main`
