# Observability And Operations

## Logging Goals

Logging should be present from the first runnable slice, not added after debugging becomes painful.

Primary goals:

- diagnose failures quickly
- understand request and workflow behavior
- capture structured fields for filtering
- support Railway-hosted troubleshooting

## Serilog Plan

Use Serilog as the application logging standard across API and background workflows.

Recommended packages and features:

- `Serilog.AspNetCore`
- `Serilog.Sinks.Console`
- `Serilog.Formatting.Compact`
- `Serilog.Enrichers.Environment`
- `Serilog.Enrichers.Thread`
- optional sink expansion later if you adopt Seq, Grafana Loki, or another aggregator

## Logging Conventions

Log with structured properties, not string-only prose.

Important properties:

- `CorrelationId`
- `UserId`
- `CollectionId`
- `ItemId`
- `RequestPath`
- `Feature`
- `Outcome`

## Events Worth Logging

### Information

- application startup
- request completion summary
- collection created
- item created or updated
- attribute definition changed
- media attached

### Warning

- validation rejection patterns worth noticing
- missing media references
- unsupported client input
- concurrency conflicts

### Error

- unhandled exceptions
- database failures
- external storage failures
- migration or startup readiness issues

## API Middleware Baseline

Add from the start:

- request logging middleware
- global exception handling
- problem details responses
- correlation/request ID propagation
- health check endpoint

## Railway Deployment Shape

Recommended services:

- `catalog-api`
- `catalog-web`
- Railway PostgreSQL instance

Optional later:

- object storage integration for media
- log aggregation target

## Configuration Strategy

Use environment-based configuration with clear separation between:

- local development
- test
- production

Minimum environment variables:

- `ConnectionStrings__CatalogDb`
- `ASPNETCORE_ENVIRONMENT`
- `SERILOG__MINIMUMLEVEL__DEFAULT`
- web app API base URL setting

## Migrations And Release Safety

- Keep EF Core migrations in source control.
- Run migrations as part of deployment workflow or controlled startup logic.
- Add startup logging that clearly shows database connection success/failure.
- Add a simple `/health` endpoint plus a database readiness check.
