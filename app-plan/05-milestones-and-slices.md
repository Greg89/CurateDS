# Milestones And Slices

## Milestone 0: Foundation

Goal:
Create the repo skeleton, local run path, CI baseline, logging foundation, PostgreSQL wiring, and first tests.

Deliverables:

- solution and project structure
- Serilog configured
- PostgreSQL connection working
- initial migration
- health endpoint
- test projects wired up
- CI pipeline running tests

Exit criteria:

- app boots locally
- web talks to API
- database migration applies
- sample log events are visible in console output

## Milestone 1: First Vertical Slice

Goal:
Prove the architecture end to end with one valuable workflow.

Recommended slice:

- create collection
- define at least one custom attribute
- create item inside collection
- view item details in web UI

Exit criteria:

- user can complete the workflow from browser to database
- domain rules are tested
- API and UI tests cover the slice

## Milestone 2: Core Cataloging MVP

Goal:
Deliver a personally useful catalog app.

Completed in the current implementation:

- item list and detail screens
- tags
- locations
- item editing
- search/filter
- custom attribute filtering
- item sorting
- saved views
- routed collection workspace with overview, items, and settings screens

Still remaining from the original MVP direction:

- media metadata support
- item event history
- denser browsing views for larger collections
- scalable server-side item querying and pagination
- deeper client decomposition into reusable feature components and hooks

Exit criteria:

- user can manage a real collection without admin workarounds
- filtering and metadata are performant enough for day-to-day use

## Milestone 3: Quality Of Life And Reporting

Goal:
Improve usability and insight.

Deliverables:

- dashboard summaries
- recent activity
- richer search/filter UX
- export options
- simple reports by collection, tag, location, or status

## Milestone 4: Mobile Readiness

Goal:
Prepare for a mobile client without rewriting core behavior.

Deliverables:

- API cleanup and version review
- auth/session hardening if needed
- client contract review
- spike for React Native / Expo

## Suggested Backlog Themes

- ownership and user profile
- collection templates
- configurable attributes
- item lifecycle/events
- media support
- saved search and dashboard
- deployability and operability

## Build Order

1. Foundation and plumbing
2. Collection creation slice
3. Attribute-definition slice
4. Item creation and detail slice
5. Tag/location slice
6. Search/filter slice
7. Routed workspace and saved views slice
8. API contract standardization pass
9. Scalable item query and pagination slice
10. Media/event slice
11. Dashboard/reporting slice

## Immediate Next Roadmap

1. Refactor item listing so search, filter, and sort run in the repository and EF query rather than in-memory application logic.
2. Introduce a paged item-list API contract and update the web client to consume it.
3. Preserve the current Problem Details strategy while tightening list and pagination contracts.
4. Split the routed web client into smaller feature components and hooks for maintainability and TDD.
5. Resume the remaining MVP feature work with media metadata, item history, and denser browsing views.
