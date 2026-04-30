# Mobile Feature Roadmap

The roadmap is phased to deliver a usable MVP early and add capability incrementally. Each phase ends with a slice that is demonstrable on a real device against the staging backend. **Time estimates are deliberately omitted**; phases ship when their exit criteria are met.

## Phase 0 — Foundation

Goal: an Expo app that boots, authenticates against the real Auth0 tenant, and reaches the staging API.

- Initialize `apps/mobile/` as an Expo TypeScript project.
- Configure ESLint, Prettier, and TypeScript matching the web app's conventions.
- Wire EAS for managed builds. Set up dev, preview, and production build profiles.
- Register a **new Auth0 native application**; add the mobile callback and logout URLs to the existing Auth0 tenant.
- Implement Auth0 PKCE login + token refresh + secure storage.
- Configure CI: type-check, lint, and unit tests run on every PR alongside the existing `backend` and `frontend` checks.
- Add the mobile project to [.github/workflows/ci.yml](../../.github/workflows/ci.yml) as a third required status check, path-filtered to `apps/mobile/**`.

Exit criteria: a signed-in user lands on a placeholder home screen with their Auth0 profile claim visible.

## Phase 1 — Read-Only Catalog

Goal: a user can browse their existing collection from a phone, online and offline.

- Bottom tab navigation: Collections, Search, Profile (the Add tab is added in Phase 2).
- Collections list backed by `GET /collections`.
- Items grid for a selected collection backed by paginated `GET /collections/{id}/items`.
- Item detail screen with hero image, metadata, attribute values, tags, location, event history.
- Image gallery with swipe and pinch-to-zoom.
- TanStack Query persistence enabled; cache survives cold start.
- Airplane-mode browse: previously-viewed collections and items render from cache; an offline indicator is shown when the network is unreachable.

Exit criteria: a user with an existing populated collection (created via web) can browse it offline on a phone with realistic latency. No writes yet.

## Phase 2 — Item Capture

Goal: the original mobile justification — fast item creation from anywhere.

- Add tab opens the new-item flow.
- Camera screen using `expo-camera` with capture, retake, flash toggle, focus tap.
- Gallery picker fallback via `expo-image-picker`.
- New-item form: name, description, location (existing or inline-create), tags (existing or inline-create), attribute values driven by the collection's `AttributeDefinition` list.
- Multiple photos per item; first photo defaults to primary.
- Optimistic create + queued upload of `POST /items` and `POST /media`.
- Image edit affordances limited to MVP: rotate. No crop, no filters.
- Local validation mirrors `CreateItemCommandValidator`. Server-side `urn:curateds:problem:validation` failures surface field-level errors in the form.

Exit criteria: 15-second target met for "photo + name + save" on a real device. New items appear in the web app within 30 seconds of reconnection.

## Phase 3 — Edit, Delete, Media Management

Goal: round-trip parity for items.

- Edit existing item (same form as create, prefilled).
- Delete item with confirmation; soft-delete reflected in cache.
- Media gallery management: upload more photos, delete, set primary.
- Item event history view (read-only) backed by `GET /items/{id}/events`.

Exit criteria: anything a user can do to an item on the web, they can do on mobile, except attribute-definition authoring.

## Phase 4 — Search & Filter

Goal: find an item quickly.

- Text search within a collection (uses the existing `searchText` query parameter).
- Filter by location, tag(s), attribute value where the attribute definition has `IsFilterable = true`.
- Sort options matching the web (`SortBy`, `SortDirection`).
- Filters surface in a bottom sheet; chip indicators show active filters.
- Recent searches stored locally per collection.

Exit criteria: filter UX feels native (bottom sheet, gestures) while consuming the same query string the web does.

## Phase 5 — Sync Hardening

Goal: the offline story is robust enough for real-world use.

- Visible sync queue UI (pending operations, last sync timestamp, retry button).
- Conflict-detection toast when last-write-wins overwrites a remote change.
- Foreground refresh on app activate with stale-time tuning.
- Failed-upload recovery: local files for failed uploads remain on disk and are retried.
- Storage budget: cap on cached image bytes; LRU eviction with a "manage storage" screen.

Exit criteria: a chaos test (kill API mid-sync, airplane-mode flap, force-quit during photo upload) does not cause data loss or duplicate items.

## Future (Post-MVP)

Not committed; the most-likely-next set, in priority order:

1. Barcode/QR scanning for item lookup. Requires a backend product-lookup integration first.
2. Push notifications (collection invitations, sync alerts). Requires backend notification infrastructure.
3. Tablet layouts.
4. Dark mode.
5. Item-level deep-link sharing (mobile link → web view of public-shared item).

The following are not on the roadmap and shouldn't appear in user-facing planning until there is a domain reason: voice notes/transcription, wishlist, price tracking, social/community features, marketplace integrations, 3D model viewing.

## Cross-Cutting Concerns

- Each phase produces an EAS preview build for stakeholder testing.
- Each phase ships with tests (see [03-mobile-quality-and-engineering.md](./03-mobile-quality-and-engineering.md)) and documented manual smoke checks.
- API changes required by mobile go through the existing backend PR process. Mobile does not invent endpoints.

## Anti-Goals

- No phase introduces a feature that requires a new domain entity without that entity first existing in the backend.
- No phase ships behind a "Use the web app for that" message reachable from a primary navigation tab.
