# Bootstrap Checklist

## Immediate Setup Decisions

- Use .NET 9 for backend projects.
- Use React + TypeScript + Vite for the web app.
- Use PostgreSQL on Railway.
- Use EF Core migrations from the start.
- Use Serilog console logging in local and Railway environments.

## Repo Bootstrap Checklist

1. Create `src` and `tests` structure from the starter layout.
2. Create the .NET solution and backend projects.
3. Create the React web app.
4. Wire local dev startup for API, web, and PostgreSQL.
5. Add Serilog configuration and request logging.
6. Add first EF Core DbContext and migration.
7. Add health checks and problem details.
8. Add test projects and first passing tests.
9. Add CI pipeline for test execution.
10. Deploy a thin vertical slice to Railway.

## First Stories To Implement

### Story 1

As a user, I can create a collection so I can separate hobbies cleanly.

### Story 2

As a user, I can define custom attributes for a collection so the app works for my specific hobby.

### Story 3

As a user, I can add an item with both core fields and custom attribute values.

### Story 4

As a user, I can view a collection's items and open item detail.

## Risks To Manage Early

- over-engineering extensibility before the first real workflow exists
- letting flexible metadata weaken relational integrity
- pushing logging and operational concerns to a later phase
- allowing the web client to hold business rules that belong in the backend
- building too many hobby-specific assumptions into naming or templates

## Review Questions

Use these when reviewing the plan:

- Does the domain vocabulary feel generic enough for multiple hobbies?
- Are the initial milestones small enough to ship and validate?
- Is the custom attribute model flexible without becoming unqueryable?
- Does the stack feel maintainable for a long-lived personal project?
- Is there enough operational maturity for Railway deployment from the first slice?
