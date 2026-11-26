# Hobby Catalog App Plan

This folder turns the lightweight `docs/` notes into a build-ready implementation plan for a personal hobby catalog platform.

The plan assumes:

- Hobby-agnostic cataloging is a core product rule.
- The system should stay relational and PostgreSQL-backed.
- V2 is an API and web app only.
- Mobile is out of scope until the web product earns a fresh mobile strategy.
- Logging and observability are first-class from day one, with Serilog as the primary application logger.
- Hosting targets Railway.
- Delivery happens in clear milestones.
- TDD, domain-driven design, SOLID design, and pragmatic best practices are baseline expectations.

Recommended reading order:

1. `00-product-and-solution.md`
2. `01-technical-direction.md`
3. `02-domain-and-data-plan.md`
4. `03-quality-and-engineering.md`
5. `04-observability-and-operations.md`
6. `05-milestones-and-slices.md`
7. `06-bootstrap-checklist.md`
