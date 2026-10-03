# V2 Slice 5: Collection Words And Custom Fields Handoff

Status (2026-10-03): implemented and validated. Slice 5 is complete.

## Delivered

- Settings includes **What do you collect?** with singular/plural labels, a preview, explicit save/discard, failed-save draft recovery, and an item/items reset. Labels apply to overview actions/counts/pins, browse counts/actions, item forms/detail actions, and insights. Collection switching resets local form state and uses the selected collection's saved words.
- Owner-scoped PUT `/collections/{collectionId}/vocabulary` validates both labels before mutation (1–40 trimmed characters, no control characters). It saves independently of identity and presentation. Collection list/create/update responses include vocabulary so the existing collection provider remains authoritative for workspace context.
- The additive `20261003140936_AddCollectionVocabulary` migration gives existing collections the item/items defaults. The legacy client can continue consuming the additive collection response.
- Settings also includes **Choose your custom fields**: create, rename, select required/filterable behavior, scope to all items or an existing collection item type, and remove with explicit confirmation. Text, whole number, decimal, yes/no, and date are offered for new fields. Data type remains immutable on edit.
- Existing attribute-definition application services and repositories remain authoritative. New V2 POST/PUT/DELETE routes validate inputs, session, origin, collection/field response IDs, and allowed paths. OpenAPI response metadata and the checked-in generated contracts include all consumed operations.
- Field changes invalidate options, item lists/detail, insights, and overview queries. Required fields appear in the item editor; type-specific fields follow the selected type. Duplicate-name and transport errors retain the form. Cancellation/removal restores keyboard focus to Add a custom field.
- Removal explicitly explains that saved values are permanently deleted. Rename keeps values by definition ID; it changes the field key under existing domain behavior, so the edit form explains that saved views using the old field name need recreation.

## Validation

- .NET: 332 passing cases across solution and the added infrastructure rerun (57 domain, 120 application, 126 API, 29 infrastructure); one optional live-storage case skipped.
- All 29 infrastructure cases passed against isolated PostgreSQL 17. Coverage includes upgrading a seeded collection from the previous migration, normalized label persistence/reset, presentation preservation, field rename/scope changes retaining values, and deletion removing only that field's values.
- V2: 70 unit/component tests and production build passed.
- All 38 desktop/mobile browser cases passed across the full run and focused rerun. The initial four failures were status selectors that matched multiple independent forms or loading messages; selectors were corrected. All 12 affected-workflow checks passed in the final rerun, including keyboard focus restoration.
- Custom-field list/editor and vocabulary screenshots reviewed on desktop/mobile. Browser tests use isolated session/API fixtures; actual persistence is verified separately by API and relational tests.
- Docker API rebuilt with `compose.media.yaml` preserved and healthy. V2 local preview restarted on localhost:3001.
- Legacy web and interactive live Auth0 acceptance were not rerun; this task leaves the authentication implementation and legacy client unchanged.

## Scope and continuation

This completes the planned Slice 5 feature scope: visual presets, identity, pins, optional overview sections, collection vocabulary, and custom-field choices. Continue with **Slice 6: Showcase V1**, starting with a private preview using authoritative collection presentation data.

Creating/renaming item types and managing account-wide tags/locations still use the legacy client. Existing SingleSelect fields remain editable as text choices; no predefined-choice list exists in the current API, so V2 does not offer new SingleSelect fields. Field reordering, choice-list design, and automatic migration of saved-view filters are not part of this task. Changing field scope retains stored values immediately; later item saves still apply the existing attribute validation/replacement rules.

All customization remains private workspace data; this task adds no public sharing.
