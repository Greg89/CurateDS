# Feature Roadmap For A Hobby And Collecting App

Date: 2026-05-13 (original) — Refined: 2026-05-31

This roadmap assumes CurateDS should become the serious personal inventory system for collectors across hobbies, not a niche-only tracker. The strongest product direction is "flexible catalog core plus collector-specific workflows."

## 2026-05-31 Refinement Summary

The milestone shape from the original review is largely correct. The 2026-05-31 pass made the following adjustments:

- **Added Milestone 0 — "Data trust"** ahead of every other milestone. Restore-deleted, on-demand export, and import safety are foundational; users will not invest hours of cataloging in an app whose export story is unproven.
- **Promoted loan tracking** from Milestone 5 to Milestone 2. It is technically cheap (status enum + borrower + due-date reminder) and is one of the strongest viral on-ramps for board game / book / tool collectors. Public showcase, sale ledger, and team permissions remain at M5.
- **Promoted wishlist/watchlist** from "Near-Term Priority #5" to Milestone 3 alongside acquisition. Pre-purchase research is a daily habit; cataloging is a one-time burst. Wishlist drives return visits.
- **Added a labels / QR printing capability** to Milestone 4. High signal-to-effort ratio and a known word-of-mouth driver in collector communities.
- **Cut natural-language search** from Milestone 4. Adds privacy questions (LLM access to private item names/notes) without clear ROI for a personal catalog. Structured query builder + saved-view-as-dashboard captures the high-value 80%.
- **Demoted public collection showcase** out of the near-term plan. Showcase pages drag in moderation, abuse reporting, SEO, social previews, and rate limiting. Private share links capture ~90% of the value at ~10% of the cost; defer public showcase to a post-paid-tier consideration.
- **Narrowed Milestone 6 metadata adapters to one (ISBN/books).** Open Library and Google Books are free, stable, and have no ToS landmines. Discogs / BoardGameGeek / card-pricing have rate limits and licensing risk. Ship one excellent ISBN flow as the proof point for the adapter abstraction, then pick the next vertical based on user demand.

See `05-progress-and-next-priorities.md` for the consolidated next-priority queue that combines remaining refactors with this refined roadmap.

## Product Positioning

CurateDS should own three jobs:

1. Capture quickly.

   A collector should be able to add an item the moment they buy it, find it in storage, photograph it, scan it, or remember it.

2. Understand the collection.

   The app should answer what the user owns, where it is, what it is worth, what condition it is in, what is missing, and what has changed.

3. Act on the collection.

   The app should help with selling, insuring, lending, grading, maintaining, sharing, and planning future purchases.

## Milestone 0 - Data Trust (NEW — 2026-05-31)

Goal: make users confident that their data is theirs and recoverable before they invest hours of cataloging.

Features:

- Restore deleted items and collections from a recycle bin (the backend already soft-deletes; the UX surface is missing).
- On-demand full export (CSV + JSON backup + media manifest) with progress feedback.
- Streaming export so the export endpoint does not load the full collection in memory (see `01-targeted-refactors.md` — `ItemRepository.ListByCollectionAsync` performance gap).
- Import preview / dry run that reports what would be created, updated, or rejected before any write.
- Visible audit of what was changed and when (extends existing activity history).

Why:

Every collector will at some point fat-finger a delete or import. The app's reputation is set by what happens the first time that occurs. This milestone is also a prerequisite for the CSV import work in M1 — import without restore is a trap.

## Milestone 1 - Catalog Confidence

Goal: make the current web-first catalog feel dependable for real collectors.

Features:

- Bulk import from CSV with column mapping to existing custom attributes (gated on M0 import preview).
- Bulk edit for tags, locations, item type, and common attribute values.
- Duplicate detection by name, custom key fields, barcode/serial number, and image hash later.
- Collection templates for common hobbies: books, vinyl, comics, board games, trading cards, cameras, tools, sneakers, watches, art, plants.
- Required field completion view: "items missing condition", "items missing photo", "items missing location".
- Better export options: CSV-only, ZIP with media manifest, JSON backup, filtered export.
- (Restore/undo moved to Milestone 0.)

Why:

The current app is already a catalog. This milestone reduces friction and data cleanup pain.

## Milestone 2 - Mobile Capture Companion (+ Loan Tracking)

Goal: make mobile the fastest way to add and verify items, and add the cheapest viral feature on the roadmap.

Features:

- Offline draft queue with later sync.
- Camera-first item creation with multiple photos.
- Barcode/ISBN/UPC scan field and lookup pipeline (lookup itself defers to M6 once the adapter pattern lands).
- Location quick-pick while capturing.
- Recent tags and recent locations.
- Voice-to-notes or quick note capture.
- "Add another like this" duplication flow.
- Mobile item search optimized for in-person lookup while shopping or sorting.
- **Loan tracking (promoted from M5):** status enum (`Available`, `LentOut`, `Borrowed`), borrower name + optional contact, lent date, due date, return date, optional reminder. No public-facing surface needed.

Why:

Collecting is physical. Mobile should be the capture and field-check companion, while web remains the power-management surface. Loan tracking lands here because it is technically cheap and dramatically extends the wedge audience (board games, books, tools — all hobbies where lending is a daily reality).

## Milestone 3 - Acquisition, Wishlist, Condition, Valuation, Provenance

Goal: shift from inventory to collection management.

Features:

- Acquisition records: date, source, paid amount, currency, seller, receipt photo.
- **Wishlist / watchlist (promoted from "Near-Term #5"):** wanted-but-not-owned items with target price, priority, source link, optional alert when owned items match. Drives return visits before cataloging is "done".
- Condition model: per collection/type scales, condition notes, graded/certified status.
- Valuation records: estimated value, source, date, confidence, notes.
- Value history charts and collection value summary.
- Insurance export/report.
- Provenance attachments and certificates.
- Serial number, edition, print/run, variant, and authenticity fields as optional first-class concepts.

Prerequisite: transaction boundaries (P2-B) must be in place before this milestone — these features add several multi-table writes per item operation.

Why:

Collectors care about story, state, and value. Custom attributes can store some of this, but first-class models unlock reports, alerts, and workflows. Wishlist sits here because it shares the acquisition data shape (source, target price, priority) and benefits from the same UI primitives.

## Milestone 4 - Discovery, Smart Organization, And Labels

Goal: help users find, group, reason about, and physically organize growing collections.

Features:

- Saved views promoted into dashboards.
- Advanced search syntax or structured query builder.
- Smart collections: dynamic collections based on filters.
- Related items and sets: series, franchises, artists, creators, manufacturers, publishers.
- Missing-from-set tracking.
- Collection completeness by set/category.
- Recommendations from user-defined gaps, not opaque ads.
- **Label / QR printing (NEW):** print location labels and item cards with QR codes that link to the item detail URL. Highly requested by collectors who use bins, shelves, and binders. Cheap to implement (PDF generation + a public-but-tokenized item URL) and a strong word-of-mouth driver.
- ~~Natural-language search~~ — cut on 2026-05-31. See refinement summary above.

Why:

Once collections grow, the app needs to reduce cognitive load both digitally and in the physical space where the items live.

## Milestone 5 - Sharing, Selling, And Collaboration

Goal: support social and transactional collector workflows without forcing public exposure.

Features:

- Private share links for selected items/views.
- Sale status: not for sale, considering, listed, sold.
- Sale records: sale price, marketplace, buyer, fees, net proceeds.
- Household/team access for shared collections.
- Role-based permissions: owner, editor, viewer.
- ~~Public collection showcase pages~~ — deferred past M5 on 2026-05-31. The moderation/abuse/SEO surface is large for a small team. Private share links cover the bulk of demand. Revisit if/when a paid tier or community feature is on the table.
- (Loan tracking moved to M2.)

Why:

Collectors often share, trade, lend, sell, and document collections for other people — but "share" is overwhelmingly private-to-a-known-recipient, not public broadcast.

## Milestone 6 - Automation And Integrations

Goal: reduce manual data entry and connect to hobby ecosystems.

Strategy refinement (2026-05-31): **ship one excellent adapter first, not five mediocre ones.** The first adapter doubles as the proof of the abstraction.

Features:

- **Adapter v1 — Books / ISBN.** Open Library + Google Books. Free, stable, no ToS landmines. Powers the M2 barcode-scan flow end-to-end.
- Adapter abstraction: `IMetadataLookupProvider` with hobby-scoped registration, caching, attribution, and rate-limit awareness.
- Adapter v2+ chosen by user demand: vinyl (Discogs), board games (BoardGameGeek), comics/cards. Each requires a licensing/ToS check.
- Receipt/email import (deferred until adapter v1 proves the pattern).
- Marketplace watchlist links.
- Scheduled valuation refresh where provider terms allow.
- Webhooks or export automation.

Why:

This is where CurateDS can become dramatically more useful, but it should come after the core model and privacy posture are stable. Pacing adapter rollout one-at-a-time also keeps maintenance and rate-limit handling honest.

## Near-Term Feature Priorities

Refined 2026-05-31. The next feature set after the remaining refactors land:

1. Restore deleted item / collection (M0).
2. Streaming on-demand export with media manifest (M0).
3. CSV import with mapping, preview, and dry-run (M1, gated on #1–#2).
4. Mobile offline draft queue (M2).
5. Loan tracking — status, borrower, due date, reminder (M2).
6. Wishlist / watchlist (M3 leading edge).
7. Acquisition fields and acquisition history (M3).
8. Condition model with templates (M3).
9. Duplicate detection (M1).
10. Private share links (M5 leading edge).
11. ISBN scan + lookup adapter v1 (M6 proof of concept).

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

