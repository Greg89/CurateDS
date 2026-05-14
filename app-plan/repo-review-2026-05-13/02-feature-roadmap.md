# Feature Roadmap For A Hobby And Collecting App

Date: 2026-05-13

This roadmap assumes CurateDS should become the serious personal inventory system for collectors across hobbies, not a niche-only tracker. The strongest product direction is "flexible catalog core plus collector-specific workflows."

## Product Positioning

CurateDS should own three jobs:

1. Capture quickly.

   A collector should be able to add an item the moment they buy it, find it in storage, photograph it, scan it, or remember it.

2. Understand the collection.

   The app should answer what the user owns, where it is, what it is worth, what condition it is in, what is missing, and what has changed.

3. Act on the collection.

   The app should help with selling, insuring, lending, grading, maintaining, sharing, and planning future purchases.

## Milestone 1 - Catalog Confidence

Goal: make the current web-first catalog feel dependable for real collectors.

Features:

- Bulk import from CSV with column mapping to existing custom attributes.
- Bulk edit for tags, locations, item type, and common attribute values.
- Duplicate detection by name, custom key fields, barcode/serial number, and image hash later.
- Collection templates for common hobbies: books, vinyl, comics, board games, trading cards, cameras, tools, sneakers, watches, art, plants.
- Required field completion view: "items missing condition", "items missing photo", "items missing location".
- Better export options: CSV-only, ZIP with media manifest, JSON backup, filtered export.
- Undo/restore for soft-deleted collections/items.

Why:

The current app is already a catalog. This milestone reduces friction and data cleanup pain.

## Milestone 2 - Mobile Capture Companion

Goal: make mobile the fastest way to add and verify items.

Features:

- Offline draft queue with later sync.
- Camera-first item creation with multiple photos.
- Barcode/ISBN/UPC scan field and lookup pipeline.
- Location quick-pick while capturing.
- Recent tags and recent locations.
- Voice-to-notes or quick note capture.
- "Add another like this" duplication flow.
- Mobile item search optimized for in-person lookup while shopping or sorting.

Why:

Collecting is physical. Mobile should be the capture and field-check companion, while web remains the power-management surface.

## Milestone 3 - Valuation, Condition, And Provenance

Goal: shift from inventory to collection management.

Features:

- Acquisition records: date, source, paid amount, currency, seller, receipt photo.
- Condition model: per collection/type scales, condition notes, graded/certified status.
- Valuation records: estimated value, source, date, confidence, notes.
- Value history charts and collection value summary.
- Insurance export/report.
- Provenance attachments and certificates.
- Serial number, edition, print/run, variant, and authenticity fields as optional first-class concepts.

Why:

Collectors care about story, state, and value. Custom attributes can store some of this, but first-class models unlock reports, alerts, and workflows.

## Milestone 4 - Discovery And Smart Organization

Goal: help users find, group, and reason about growing collections.

Features:

- Saved views promoted into dashboards.
- Advanced search syntax or structured query builder.
- Smart collections: dynamic collections based on filters.
- Related items and sets: series, franchises, artists, creators, manufacturers, publishers.
- Missing-from-set tracking.
- Collection completeness by set/category.
- Recommendations from user-defined gaps, not opaque ads.
- Natural-language search against item names, notes, attributes, and tags after privacy decisions are made.

Why:

Once collections grow, the app needs to reduce cognitive load rather than just store more rows.

## Milestone 5 - Sharing, Selling, And Collaboration

Goal: support social and transactional collector workflows without forcing public exposure.

Features:

- Private share links for selected items/views.
- Public collection showcase pages.
- Loan tracking: who borrowed what, when, due date, notes.
- Sale status: not for sale, considering, listed, sold.
- Sale records: sale price, marketplace, buyer, fees, net proceeds.
- Household/team access for shared collections.
- Role-based permissions: owner, editor, viewer.

Why:

Collectors often share, trade, lend, sell, and document collections for other people.

## Milestone 6 - Automation And Integrations

Goal: reduce manual data entry and connect to hobby ecosystems.

Features:

- Metadata lookup adapters by hobby:
  - Books: ISBN providers.
  - Vinyl: Discogs-style lookup.
  - Board games: BoardGameGeek-style lookup.
  - Comics/cards: external catalog/price providers where terms allow.
- Receipt/email import.
- Marketplace watchlist links.
- Scheduled valuation refresh where provider terms allow.
- Webhooks or export automation.

Why:

This is where CurateDS can become dramatically more useful, but it should come after the core model and privacy posture are stable.

## Near-Term Feature Priorities

The next feature set I would build after refactors:

1. CSV import with mapping and preview.
2. Mobile offline draft queue.
3. Acquisition fields and acquisition history.
4. Condition model with templates.
5. Wishlist/watchlist items.
6. Duplicate detection.
7. Private share links.
8. Restore deleted item/collection.

## Feature Ideas By Hobby

Books:

- ISBN scan and lookup.
- Edition, format, publisher, signed copy, reading status.
- Series completeness.

Vinyl:

- Artist, album, pressing, label, condition, matrix/runout.
- Discogs-style external ID.
- Wantlist and value tracking.

Trading cards:

- Set, card number, variant, grade, grading company, certification number.
- Population/value snapshots.

Board games:

- Player count, playtime, expansions, sleeve status, missing components.
- Loan and play history.

Tools:

- Warranty, maintenance date, storage location, consumables, serial number.

Collectible cameras:

- Lens mount, serial number, condition, last service date, sample photos.

Sneakers/watches/art:

- Authentication status, purchase source, receipt/certificate, insurance value.

