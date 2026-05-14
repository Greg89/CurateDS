# CurateDS Repo Review - Overview And Rating

Date: 2026-05-13

## Executive Summary

CurateDS is currently a solid early-stage hobby catalog platform with a clean backend architecture, a usable web client, an emerging mobile client, and a better-than-average automated test posture for this phase. The app is already past "prototype" on the backend and web path: collections, item CRUD, custom attributes, tags, locations, item types, saved views, media upload, reports, activity history, exports, Auth0 authentication, PostgreSQL persistence, and Railway-oriented deployment are all represented.

The strongest part of the repo is its backend layering. Domain, application, infrastructure, API, and test projects are separated clearly, and the application services generally enforce owner-scoped access before touching collection data. The web app is feature-rich for an MVP and uses React Query well enough to support a responsive catalog workflow. Mobile is present and tested at the screen/API-client level, but it is still behind the web feature set and currently has local dependency/typecheck friction.

The main risk is that several "MVP growth" files have become coordination hotspots. `CollectionEndpoints.cs`, `ItemRepository.cs`, `apps/web/src/api.ts`, and `ItemsPage.tsx` are each carrying too many responsibilities. That is normal at this point, but the next feature wave should start with targeted decomposition so search, valuation, import/export, offline capture, and collection-specific workflows do not make those files brittle.

## Current Product Shape

CurateDS is hobby-agnostic rather than niche-specific. The current model supports multiple independent collections owned by an authenticated user. Each collection can define custom typed attributes, optional item types, and reusable organization metadata through tags and locations.

Current web capabilities include:

- Creating and deleting collections.
- Creating, updating, deleting, filtering, sorting, and paging items.
- Custom attribute definitions per collection, including item-type-specific fields.
- Global user tags and locations.
- Item type management per collection.
- Saved filter views.
- Overview metrics and report drill-through.
- Item detail drawers with activity history and media.
- Uploading, deleting, and selecting primary item images.
- ZIP export containing item and attribute-definition CSVs.

Current backend capabilities include:

- ASP.NET Core minimal API surface under `/collections`, `/tags`, `/locations`, and media endpoints.
- Auth0 JWT bearer authentication required for collection and organization endpoints.
- PostgreSQL through EF Core and Npgsql.
- Global soft-delete filters for primary catalog entities.
- S3-compatible media storage adapter.
- Serilog, correlation IDs, health checks, production exception handler, and startup database migrations.
- CI jobs for backend, frontend, mobile, and SonarCloud.

Current mobile capabilities include:

- Auth context and token persistence.
- Collection and item browsing screens.
- Add flow with camera/gallery capture.
- New item form with tags, locations, and dynamic attributes.
- Item detail screen.
- React Query persistence and an offline banner.

## Architecture Assessment

The backend uses a pragmatic Clean Architecture style:

- `packages/domain`: aggregate/domain entities and business rules.
- `packages/application`: commands, queries, DTOs, validators, use-case services, persistence/storage abstractions.
- `packages/infrastructure`: EF Core context, repositories, migrations, current user service, S3-compatible storage.
- `apps/api`: composition root, minimal API endpoint mapping, request/response contracts, middleware and configuration.

This is a good fit for the product because the main business logic is not UI-specific. The same application layer can support web, mobile, imports, background jobs, and future integrations.

The web app is a Vite React SPA with React Router and TanStack Query. The current implementation is pragmatic and productive, but it has a thin API layer without generated contracts or runtime validation. In contrast, mobile already uses zod schemas for API response validation. That mismatch is worth fixing before the API grows much further.

The mobile app is Expo/React Native with React Navigation and TanStack Query persistence. It is directionally right for collector workflows because mobile capture is a natural differentiator for this product. It should be treated as an offline-first capture companion, not only a smaller copy of the web UI.

## Quality And Test Assessment

Static counts from the repo:

- 217 C# files across apps, packages, and tests.
- 80 TypeScript/TSX files across apps and tests.
- 159 xUnit facts/theories by static scan.
- 132 JS/TS `it(...)` tests by static scan.

Local verification on 2026-05-13:

- `dotnet test CurateDS.sln --no-restore --verbosity minimal`: passed, 162 total backend tests.
- `npm.cmd run test:web -- --run`: passed, 54 web unit tests.
- `npm.cmd run build:web`: passed, with a Vite chunk-size warning for a 512 kB JS bundle.
- `npm.cmd run typecheck:mobile`: failed because local installed dependencies for mobile packages were missing or unresolved, including React Navigation, Expo Camera, NetInfo, zod, and React Query persistence packages.

The backend tests cover domain invariants, application services, and a broad API integration path. Web tests cover UI structure and key interactions. Mobile tests cover auth, API client behavior, screens, camera flow, and offline banner behavior. Missing or weaker areas are performance tests for larger collections, real PostgreSQL query-shape tests for complex filtering, visual regression testing, accessibility checks, and end-to-end coverage for web/mobile happy paths.

## Repo Rating

Overall rating: 7.4 / 10.

Breakdown:

- Architecture: 8 / 10. Strong layering, sensible boundaries, good start on observability and deployment. Needs endpoint/module decomposition and shared contract strategy.
- Backend implementation: 8 / 10. Good domain/application separation and meaningful tests. Query complexity and duplicated item validation logic are the main concerns.
- Web implementation: 7 / 10. Feature-complete for MVP and well tested at UI level. Needs component/API decomposition, stronger contract typing, bundle splitting, and more accessible/polished controls.
- Mobile implementation: 6 / 10. Correct strategic direction and useful test coverage, but still behind web and currently blocked locally by dependency/typecheck state.
- Testing/CI: 8 / 10. Strong for this stage. Needs mobile dependency reliability, E2E activation, and performance/query coverage.
- Product readiness: 7 / 10. The core catalog is real. The collector-specific value proposition still needs richer capture, valuation, provenance, wishlist, reminders, and sharing features.

## Main Strengths

- The domain is hobby-agnostic without being too abstract. Collections, custom attributes, tags, locations, item types, media, saved views, and events are the right primitives.
- Owner scoping is present in application services before collection operations.
- Tests are not superficial; they cover meaningful service and endpoint behavior.
- The repo already has deployment, Docker, health checks, logging, and CI concerns in place.
- Mobile is started early enough that API design can still be shaped by mobile capture needs.
- Reports, saved views, media, and exports push the product beyond a basic CRUD catalog.

## Main Risks

- API endpoints and client API modules are becoming too large to safely extend.
- Filtering/search logic is embedded in EF repository code and will become hard to optimize or test at realistic scale.
- Web and mobile duplicate API contracts by hand, with web lacking runtime response validation.
- Mobile local dependency state is not currently healthy enough to trust typecheck as a baseline.
- Storage makes the bucket public during upload flow, which is simple but not ideal for private collections.
- The product has catalog mechanics, but not yet enough collector-specific "why this app" features such as provenance, valuation, acquisition history, insurance views, wishlists, and reminders.

