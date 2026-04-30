# Mobile Product Direction

## Why A Mobile App Exists

The CurateDS web app is the primary cataloging surface. A mobile companion exists for one reason: collectors most often need their catalog **in places where opening a laptop is impractical** — flea markets, conventions, estate sales, friends' shelves, the storage unit, the back of a record store.

Build the mobile app around that reality. Anything that doesn't earn its place against that test belongs on the web.

## Experience Qualities

1. **Always available.** Catalog data is browsable and searchable with no network. Writes queue locally and reconcile when connectivity returns.
2. **Capture-first.** Adding an item from a phone — primarily by camera — must be faster than typing on the web. Sub-15 seconds for "photo + name + collection" is the bar.
3. **Faithful to the catalog.** Every entity the user creates on mobile maps cleanly to the same domain model the web uses. No mobile-only schema, no parallel data store.

## In Scope For Mobile MVP

The mobile MVP must satisfy these workflows end-to-end against the existing API:

- Authenticate via the same Auth0 tenant the web uses (PKCE flow with the system browser).
- Browse owned collections, items in a collection, and item detail.
- Search and filter items within a collection (text search, location, tag).
- Create a new item: name, optional description, location, tags, attribute values, one or more photos captured from camera or picked from gallery.
- Edit an existing item's core fields, tags, location, and attribute values.
- Soft-delete an item.
- Manage the item's media gallery: upload, delete, set primary.
- View item event history (audit trail).
- Operate fully offline for reads; queue writes for sync when reconnected.

## Out Of Scope For MVP

The following are explicit non-goals. Some may become later milestones; none belong in MVP.

- Creating, deleting, or renaming collections (web-only management surface).
- Defining or editing attribute definitions (web-only schema authoring).
- Managing tags or locations as standalone resources (mobile creates new ones inline only).
- Barcode and QR scanning. Worth a follow-up milestone, not MVP.
- Voice notes, transcription, or audio capture.
- Wishlist, price tracking, marketplace lookups, or any external-data integration.
- Social/community features, public sharing, following other users.
- Push notifications (silent foreground sync only at MVP).
- Bulk operations (multi-select, bulk edit, bulk delete).
- CSV/JSON export, PDF reports.
- Tablet-specific multi-column layouts (responsive within reason, but phone-first).
- Dark mode (phase 2).

## Reconciliation With The Web App

Mobile MUST NOT introduce concepts that don't exist server-side. The current domain model
(see [02-domain-and-data-plan.md](../02-domain-and-data-plan.md) and
[docs/04-domain-model.md](../../docs/04-domain-model.md)) is:

`Collection`, `Item`, `AttributeDefinition`, `AttributeValue`, `Tag`, `ItemTag`, `Location`,
`MediaAsset`, `ItemEvent`. Mobile features map to these. There is no "wishlist" entity, no
"category" distinct from `Tag`, no "condition" field beyond what an attribute definition provides,
no "acquisition source" beyond what `ItemEvent` captures.

If a desired mobile feature implies a new entity, it belongs in the backend roadmap first, not
in the mobile plan.

## Success Criteria

The MVP is ready when, on a real device:

- A signed-in user can browse their full collection cold-start with airplane mode on.
- A user can capture, name, and save an item with one photo in under 15 seconds.
- An offline-created item appears identically in the web UI within 30 seconds of reconnection.
- All API mutations the mobile app issues use the same endpoints and contracts the web app uses.
- No regression in existing web app behavior is required to support the mobile app.
