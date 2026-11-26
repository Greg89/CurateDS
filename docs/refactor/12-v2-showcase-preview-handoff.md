# V2 Slice 6: Private Showcase Preview Handoff

Status (2026-10-03): this task is implemented and validated. Slice 6 remains in progress.

## Delivered in this task

- The collection's Showcase navigation now opens `/collections/{collectionId}/showcase` inside the existing authenticated workspace. Its compact toolbar supports returning to the collection, switching collections while staying in Showcase, and opening presentation settings.
- A first gallery presentation gives identity and cover more space, uses ordered pins as highlights, and shows optional summary counts and recent additions. Existing Forest/Clay/Slate colours and singular/plural vocabulary carry through. An item already displayed as a highlight is omitted from recent additions; hidden pins remain eligible for the recent section.
- The cover, summary, highlights, and recent sections follow the existing saved overview preferences. The collection title/description remain visible as the introduction. Empty collections and collections with all item sections hidden have useful owner-facing guidance.
- Item cards open the existing collection-scoped detail route. Missing or failed images use the shared fallback. Pins stay in their saved order; deleted items disappear through the existing API and query invalidation behavior.
- Showcase consumes the same validated summary/recent/presentation data and collection-scoped cache as Overview. Identity comes from the existing collection provider. There is no parallel catalog, new endpoint, database migration, or public data projection in this task.
- The route is labelled Private preview, uses generic metadata with `noindex, nofollow`, and inherits server session checks. Collection ownership continues to be enforced by the .NET API. Metadata is not an access control mechanism. Collection IDs unknown to the owned collection list do not substitute another collection; malformed/foreign presentation responses fail closed.

## Validation

- V2 production build and 76 unit/component tests passed.
- All 46 desktop/mobile browser cases passed across the full suite and focused reruns. Showcase coverage includes pin order, recent-item deduplication, saved section choices, item navigation/deletion, collection switching/history, empty states, image failure, API retry, expired access, mismatched collection responses, private/no-store responses, and unknown collections.
- Initial browser failures were test selectors matching the Next.js route announcer and a mobile assertion made before a lazy-loaded image entered the viewport. Selectors and scrolling were corrected; the final recovery checks passed on both devices.
- Desktop/mobile screenshots reviewed, including the image-rich gallery and introduction-only state. Item images use contain sizing to keep the complete collectible visible. Screenshots use isolated fixture artwork, not user catalog content.
- Local API health passed. V2 preview restarted on localhost:3001 for review.
- Backend, legacy web, and interactive Auth0 acceptance were not rerun because this task changes only the V2 presentation and test fixtures. Existing API/session boundaries are exercised by the browser suite.

## Scope and next task

This is the first private showcase task, not completion of Slice 6. It provides one gallery layout and uses overview section preferences. Next, add persisted showcase template selection and decide which report sections can be included, keeping configuration progressive.

Before enabling sharing, settle the shareable-route and social-preview design:

- Proposed public route: `/showcase/{slug}`, with stable collection IDs retained internally. This route is not implemented or reserved by this task.
- Publishing must be an explicit owner action with a clear preview of exactly what will be exposed; unpublish must remove access and invalidate any public caches. Opening this private preview never publishes anything.
- A dedicated public API projection should return only published identity, selected content, and approved summaries. Never expose the owner-scoped workspace endpoints, account identity, private activity, arbitrary custom-field values, or storage keys through a public facade.
- Generic metadata stays on private routes. Public title/description/preview-image generation must use only the published projection. Resolve image accessibility and cache invalidation before using catalog media in public/social previews; existing object-storage URL behavior is unchanged here.

These publication notes are a proposed boundary for the remaining Slice 6 work, not a deployed sharing feature. Slug lifecycle, theme/template choice, selected reports, publishing controls, and social preview images remain to be implemented and validated.
