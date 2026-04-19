# Product And Solution

## Vision

Build a personal catalog application that lets a user curate any hobby collection without the product being hard-coded to one hobby type such as comics, cards, games, books, or miniatures.

The product should give structure where it matters:

- collections
- items
- tags
- locations
- media
- activity history
- custom attributes per hobby or collection type

The product should stay flexible where hobby-specific variation matters:

- item fields beyond the shared core
- collection-specific metadata
- saved views and filters
- optional event history such as acquired, sold, loaned, restored, or graded

## Product Guardrails

- Hobby agnostic, but not schema-less chaos.
- Relational data model first, with controlled extensibility.
- Web-first user experience, mobile-ready backend and contracts.
- Single-user or small-user-set friendly at launch, but structured so multi-user ownership is still possible.
- Build in milestones with usable value at each stage.
- Logging, error handling, and deployment readiness are part of the MVP foundation, not cleanup work.

## Recommended Product Shape

Use a hybrid model:

- core relational entities for stable catalog concepts
- metadata definition tables for hobby-specific fields
- validation rules enforced in the application/domain layer

This gives flexibility without giving up reporting, filtering, joins, or data integrity.

## Recommended First Release

The first release should let a user:

- create one or more collections
- define a collection type or template
- create items with common fields
- attach custom attributes to items
- tag and locate items
- upload or link media
- search and filter items
- review item history/activity

## Non-Goals For MVP

- native mobile app
- social features
- marketplace integrations
- barcode scanning or OCR-heavy workflows
- advanced analytics beyond useful summary views
- collaborative editing complexity
