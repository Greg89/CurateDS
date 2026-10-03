# V2 Slice 5: Collection Settings Handoff

Status (2026-10-03): the identity-settings task is implemented. Slice 5 remains in progress.

## Delivered

- Settings at `/collections/[collectionId]/settings`: edit the collection name, category, description, HTTPS cover URL, and Forest/Clay/Slate colour.
- A live preview, dirty-state feedback, discard action, validation focus, and preservation of the draft after a failed save. Optional identity fields can be cleared.
- Saved changes immediately update the collection list and workspace context; reloads use the persisted API values. Switching collections stays in Settings and starts with the selected collection's identity.
- Shared identity fields for creation/editing, shared application validation, and one domain normalization/validation path. An invalid update leaves identity and audit fields unchanged.
- Owner-scoped `PUT /collections/{collectionId}`, transaction-backed persistence, update audit metadata, and regenerated OpenAPI contracts. Collection ID, owner, creation metadata, and items are preserved.
- The web update boundary requires a session, exact matching Origin, bounded/validated input, and a validated response. Caller-supplied ownership/audit values do not control the API update.

## Validation

- Full .NET solution: 316 passed (57 domain, 120 application, 113 API, 26 infrastructure); one opt-in media test skipped.
- V2: all 56 unit/component tests and the production build passed.
- All 28 desktop/mobile browser cases passed across the complete run and focused Settings reruns. The initial Settings failures came from an alert selector also matching Next.js's route announcer; assertions now target the Settings form.
- Screenshot review caught and corrected a narrow-screen preview overflow. A bounding-box assertion now verifies that the cover stays within its card.
- The shared creation form remains covered by the existing creation browser flow. New checks cover failed saves, validation focus, discard, persisted changes, cleared fields, collection switching, and the PUT session/origin boundary.
- Docker API rebuilt with the development storage override preserved. No migration or live Auth0 reconfiguration was needed.
- Legacy web and PostgreSQL-specific suites were not rerun: this task changes neither the legacy client nor database schema/query translation. Existing infrastructure tests passed in their default SQLite mode.

## Boundaries and next task

This task uses the existing identity columns and colour presets; no migration was required. Covers still use HTTPS links. Settings does not yet manage tag, location, type, or custom-field definitions.

Continue Slice 5 with featured/pinned items and configurable overview sections, then collection-specific labels/metadata choices and any richer visual presets needed. Keep the [V2 roadmap](../15-v2-roadmap.md#slice-5-collection-customization) as the scope reference. Showcase remains Slice 6.
