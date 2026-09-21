# CurateDS V2 Roadmap

## Roadmap Principles

- Build the collection experience before expanding the feature surface.
- Preserve the strongest current backend and domain behavior.
- Prefer one coherent vertical slice over broad unfinished infrastructure.
- Keep collection identity visible in every user-facing workflow.
- Treat presentation as a product capability, not a final marketing layer.
- Add another client only after the web experience proves the need.

## Slice 0: V2 Foundation Decision

Goal: make the product and architecture decisions explicit before implementation.

Status: Complete. Decisions accepted on 2026-09-20.

Accepted decisions:

- Create a temporary `apps/web-v2` Next.js application so the current web remains available as a behavioral reference.
- Use the Next.js App Router.
- Keep the .NET API authoritative for domain rules, persistence, authentication validation, and collection ownership.
- Let Next.js own the web session and pass the Auth0 bearer token to the API.
- Use stable collection IDs internally and human-readable slugs for showcase routes.
- Keep TanStack Query for server state.
- Make the URL authoritative for the active collection and expose it to nested components through a provider.
- Prefer OpenAPI-generated TypeScript types with runtime validation at the web boundary.
- Keep Vitest and Testing Library for component tests; add focused Playwright coverage after the shell is usable.
- Deploy the Next.js web app as a Railway service beside the existing API.

Deliverables:

- V2 product vision and collection-first model
- collection workspace specification
- product language contract
- Next.js and .NET API boundary
- decision on shared/generated API contracts
- decision on temporary parallel web app versus direct replacement

Exit criteria:

- a contributor can explain what a collection is
- a contributor knows which concepts are intentionally absent
- new screens can be evaluated against the collection-first design test
- the web migration shape, routing, authentication, contracts, state, testing, and deployment boundaries are agreed

## Slice 1: Next.js Web Foundation

Goal: establish the new web application shell without rebuilding feature workflows yet.

Deliverables:

- Next.js app under `apps/web` or a temporary V2 web workspace
- Auth0 sign-in and session boundary
- route and layout conventions
- collection switcher contract
- base typography, color, spacing, and responsive design tokens
- error, loading, empty, and not-found states
- API client boundary

Exit criteria:

- a signed-in user can reach the collection area
- collection context is available to nested routes
- the shell works on desktop and narrow screens
- API failures do not produce generic blank pages

## Slice 2: First Collection And Overview

Goal: make the first collection feel real immediately after creation.

Deliverables:

- first-run collection creation
- collection name, description, cover, and identity fields
- collection switcher
- collection header
- overview route
- item count and initial summary cards
- recent or featured content states
- empty collection guidance with a clear add-item action

Exit criteria:

- a new user can create a collection and understand what to do next
- switching collections changes the complete workspace context
- the page feels like the user's collection rather than an administration screen

## Slice 3: Browse And Curate

Goal: make repeated collection management efficient and visually grounded.

Deliverables:

- collection browse route
- search, filter, sort, and pagination behavior
- useful grid/list presentation options
- item creation and editing flow
- item detail view
- media handling
- keyboard, focus, and responsive interaction behavior

Exit criteria:

- a user can add and find items without leaving the collection context
- browse supports both efficient management and enjoyable exploration
- existing API behavior remains covered by tests

## Slice 4: Insights

Goal: make reports satisfying to explore rather than merely administrative.

Deliverables:

- collection-level insight cards
- growth and activity summaries
- category, tag, location, and custom-attribute breakdowns
- report drill-through into browse
- saved insight or view patterns where useful

Exit criteria:

- insights answer useful questions about the collection
- every insight can lead naturally back to the underlying items
- empty and sparse data states remain useful and attractive

## Slice 5: Collection Customization

Goal: let each collection develop its own identity without creating configuration overload.

Deliverables:

- collection themes or visual presets
- featured and pinned items
- configurable overview sections
- collection-specific labels and metadata choices
- reusable layout and display primitives

Exit criteria:

- two collections can feel meaningfully different
- customization improves expression without blocking basic cataloging
- settings remain understandable to a non-technical hobbyist

## Slice 6: Showcase V1

Goal: let a hobbyist show what their collection is.

Deliverables:

- showcase route
- splash page templates
- featured collection content
- selected reports or summary sections
- private preview mode
- shareable route design
- social metadata and preview image strategy

Exit criteria:

- a user can open a polished representation of their collection
- the showcase feels distinct from the management workspace
- presentation data comes from the authoritative collection model

## Slice 7: Trust And Scale

Goal: strengthen the platform after the core experience works.

Deliverables:

- transaction boundaries for multi-step writes
- media privacy and cleanup decision
- streaming or paged export
- cursor pagination or virtualization where needed
- stronger contract and query-shape tests
- import with preview and dry-run validation

Exit criteria:

- larger real collections remain practical
- destructive and multi-step operations are trustworthy
- imports and exports do not bypass domain validation

## Deferred Until Proven Necessary

- native mobile client
- member or organization functionality
- public social feed
- marketplace integrations
- speculative natural-language search
- complex collaboration
- broad template marketplace

These are not permanent prohibitions. They are intentionally downstream of proving that the collection-first web product is useful, enjoyable, and worth extending.
