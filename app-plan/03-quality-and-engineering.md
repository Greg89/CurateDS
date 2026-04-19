# Quality And Engineering

## Engineering Principles

- TDD for core domain and application behavior
- domain-driven design for business language and boundaries
- SOLID by default, but not ceremony for ceremony's sake
- clean architecture boundaries with practical tradeoffs
- thin controllers, rich domain behavior
- explicit validation and error handling

## TDD Strategy

Use different test styles by layer.

### Domain Tests

Focus on:

- invariants
- value object behavior
- item and collection rules
- attribute validation behavior
- event recording rules

These should be fast, isolated unit tests.

### Application Tests

Focus on:

- use case orchestration
- command/query behavior
- validation paths
- rule enforcement across repositories/services

Use fakes or mocks only where the test remains readable and useful.

### Integration Tests

Focus on:

- EF Core mappings
- PostgreSQL behavior
- migrations
- transaction boundaries
- API endpoint behavior against a real database

Use Testcontainers with PostgreSQL so tests exercise real relational behavior.

### End-To-End Tests

Cover a few happy-path and critical failure scenarios:

- create collection
- define attribute
- create item
- filter/search item
- upload media metadata

## Definition Of Done

A story is done only when:

- domain/application behavior is covered by tests
- API contracts are exercised by integration tests where appropriate
- logs are emitted for meaningful lifecycle or error points
- acceptance criteria are met in the UI
- documentation is updated if the behavior changes architecture or setup

## Coding Standards

- Prefer explicit names over clever abstractions.
- Keep dependencies pointing inward.
- Avoid leaking EF entities directly through API contracts.
- Use domain methods to protect invariants instead of scattered setter logic.
- Treat nullability seriously.
- Prefer composition over inheritance unless inheritance is clearly domain-driven.

## Branching And Delivery

Even for a personal project, work in small vertical slices:

- model
- use case
- API endpoint
- UI screen change
- tests

That keeps feedback tight and the app reviewable at every stage.
