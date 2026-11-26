# V2 Slice 3 Handoff

Status (2026-10-02): implemented and validated. Next scope is Slice 4: Insights.

## Delivered

- Collection browse at `/collections/[collectionId]/browse`: search, location/type/tag filters, all/any tag matching, missing-location/tag filters, sorting, pagination, and grid/list presentations. URL state survives reloads and browser history. Invalid filters, no matches, missing items, and API failures have recovery paths.
- Full item creation, detail, editing, and deletion. The editor supports quantity, description, locations, tags, and global/type-specific custom fields, including required fields and Boolean false values. Failed saves retain the draft; changing type excludes fields for other types from the write.
- Image upload (JPG/PNG/WebP/GIF, 20 MiB), primary selection, removal, image fallback, and collection-scoped cache refresh. Editing does not replace cached images with the API update receipt's empty media array.
- Browse navigation and overview links now reach the full editor/detail workflow. Switching collections from an item or browse route opens that collection's browse page and clears the old filters.
- The committed API/session plumbing is exercised through real UI flows: exact-origin checks on every mutation, server-held tokens, bounded JSON/multipart body reads, explicit route allowlists, runtime validation, and private/no-store responses.
- Native keyboard controls, required-field focus, upload focus restoration, inline destructive confirmations, responsive layouts, and no viewport overflow in desktop/mobile checks.
- Optional [local storage](../../tools/local-storage/README.md), requested by the user: a source-built MinIO development service, loopback port, persistent named volume, and API Compose override. It is running locally; remote deployment configuration is untouched.

## Validation

- .NET solution: all 300 existing tests passed (55 domain, 120 application, 106 API, 19 infrastructure).
- New opt-in real-storage acceptance test passed against the local Docker service. It exercises actual API upload, anonymous image read, primary selection, media retention after editing, browse thumbnail URL, and image/item deletion. Its isolated in-memory database and unique storage bucket are cleaned up; no test collections were inserted into the user's database.
- V2: 44 unit/component tests passed; production build and TypeScript checks passed.
- Browser coverage: 18 cases passed in the complete desktop/mobile run; the two browse cases passed in the focused rerun after fixing asynchronous filter loading and narrowing selectors. Together these cover all 20 cases. Browser tests use isolated API/session fixtures; real storage/API behavior is checked separately above.
- Detail and browse screenshots reviewed for desktop/mobile layout. Local API and storage health endpoints returned 200.
- No schema migration or domain behavior change was needed for this continuation. Existing Auth0 live acceptance remains complete.

## Remaining boundaries

Creating/editing tag, location, item-type, and attribute definitions remains in the existing web until the collection settings/customization slice. V2 can select and edit values using those definitions now. SingleSelect currently uses text because the existing definition API exposes no choice list.

Collection covers still use HTTPS image links. Item media retains the existing public-URL model; production privacy and orphan cleanup belong to Slice 7. The local MinIO community source is archived and is used only as a development fixture. See the storage README for provenance, startup, persistence, and cleanup instructions.

Insights, advanced attribute report drill-through, and saved view patterns are Slice 4. The browse query contract will need to grow to support those report filters as the insight UI is implemented.
