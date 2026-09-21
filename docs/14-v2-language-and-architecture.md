# CurateDS V2 Language And Architecture

## Product Language

Use collection language in the product and documentation:

| Avoid | Prefer |
|---|---|
| Organization | Collection |
| Organization switcher | Collection switcher |
| Dashboard | Overview |
| Members | Owner, or omit the concept |
| Organization settings | Collection settings |
| Manage metadata | Customize collection |
| Reports | Insights |
| Items table | Browse collection |
| Public profile | Collection showcase |
| Create record | Add to collection |

The word `tenant` should remain an internal implementation term only if it is needed at all. Users own collections; they do not join organizations.

## Architectural Direction

The V2 target is:

```text
apps/
  api/       ASP.NET Core API and composition root
  web/       Next.js web experience

packages/
  domain/          domain model and rules
  application/     use cases and ports
  infrastructure/  persistence and adapters
  contracts/       shared API schemas and TypeScript types (future)
  theme/           design tokens and shared visual primitives (future)
```

The current .NET domain, application, infrastructure, and API projects remain the authoritative backend foundation. The web application is the primary surface being rebuilt.

## Next.js Decision

Next.js is the preferred V2 web foundation because the long-term product requires both:

- authenticated application routes for managing collections
- public or shareable showcase routes for displaying collections

Next.js can support server-rendered presentation pages, metadata and social previews, route layouts, image handling, and a cohesive application shell.

Accepted Slice 1 implementation decisions:

- build the new experience first in a temporary `apps/web-v2` workspace
- use the App Router
- let Next.js own the web session while the .NET API continues validating Auth0 bearer tokens
- use collection IDs for internal routes and slugs for showcase routes
- deploy the V2 web app as a Railway service beside the existing API

This is a web decision, not a mobile architecture. Future React Native clients would reuse API contracts, schemas, API clients, design tokens, and business concepts. They would not reuse Next.js pages or server components.

## Backend Boundary

The .NET API remains the source of truth for:

- collection ownership and isolation
- domain rules and validation
- item, metadata, media, and history operations
- reports that require authoritative data
- authentication and authorization decisions
- persistence and transaction boundaries

The Next.js app should not become a second backend containing collection rules. It is the web experience layer over the CurateDS API.

## Contract Direction

The web and any future clients should consume explicit request and response contracts. The preferred direction is a shared or generated contract layer with runtime validation, rather than unvalidated JSON casts in each client.

Possible implementation paths include:

- OpenAPI-generated TypeScript types and clients from the .NET API
- shared Zod schemas maintained alongside generated or hand-written types
- contract fixtures tested against API integration responses

The decision should be made before the V2 web surface grows substantially.

The Slice 1 default is OpenAPI-generated TypeScript types with runtime validation at the web boundary. TanStack Query remains the server-state layer. The active collection is URL-authoritative and is exposed to nested components through a provider.

## Migration Strategy

Do not migrate the current Vite UI mechanically. V2 is a new collection workspace experience.

Recommended sequence:

1. Keep the existing API and backend tests running.
2. Create the Next.js web foundation and authentication boundary.
3. Add shared contracts and collection route/layout conventions.
4. Rebuild the collection shell and overview first.
5. Move browse, item detail, forms, insights, and showcase slice by slice.
6. Retire the old Vite web surface after the critical workflows are covered.

The backend should only be rewritten where the new web workflows demonstrate a real contract or domain limitation.
