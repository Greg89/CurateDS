# CurateDS Mobile Plan

Concise outline for the eventual CurateDS mobile companion app. **Documentation only**; no code lives here. When the project is initialized, it will live at `apps/mobile/` alongside the existing `apps/api/` and `apps/web/`.

## Documents

1. [00-mobile-product-direction.md](./00-mobile-product-direction.md) — why a mobile app exists, what it does and doesn't do, how it reconciles with the existing CurateDS domain model.
2. [01-mobile-architecture.md](./01-mobile-architecture.md) — stack, data flow, the API endpoints mobile consumes, auth, sync strategy.
3. [02-mobile-feature-roadmap.md](./02-mobile-feature-roadmap.md) — phased plan from foundation through sync hardening, with explicit anti-goals.
4. [03-mobile-quality-and-engineering.md](./03-mobile-quality-and-engineering.md) — TDD strategy, CI integration, release process, observability.

## Status

Outline only. Not yet implemented. The folder previously contained a stub web template and ~12 overlapping documents; both were removed in favor of these four reconciled outlines.

## Source Of Truth

Anything in these docs that conflicts with the actual repo loses. Specifically:

- Domain model: [app-plan/02-domain-and-data-plan.md](../02-domain-and-data-plan.md) and [docs/04-domain-model.md](../../docs/04-domain-model.md)
- API contracts: [docs/api-contracts.md](../../docs/api-contracts.md) and [apps/api/Collections/CollectionEndpoints.cs](../../apps/api/Collections/CollectionEndpoints.cs)
- Engineering conventions: [.github/copilot-instructions.md](../../.github/copilot-instructions.md)
- Tech stack precedent: [app-plan/01-technical-direction.md](../01-technical-direction.md)
