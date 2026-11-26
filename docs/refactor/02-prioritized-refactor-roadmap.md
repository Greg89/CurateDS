# Prioritized Refactor Roadmap

Status updated: 2026-10-02

The June roadmap predates merged implementation. Use this status when resuming; keep the [V2 roadmap](../15-v2-roadmap.md) in view as the next product phase.

## Completed implementation

- Filter/query symmetry, saved-view restoration and malformed-row handling.
- Drawer unmount fix.
- Saved-view write validation with application and API coverage.
- Application unit-of-work abstraction and EF transaction implementation, used by item and other catalog write services.
- Best-effort media-upload compensation after database failure.
- Baseline tag-picker outside-click and Escape handling.

## Completed: Tag Picker Focus

- Focus the first checkbox when opening.
- Keep native Tab/Shift+Tab and Space interaction for the checkbox group.
- Close when focus leaves without stealing focus from the destination.
- Close and reset when disabled, preventing the clear action from remaining interactive.
- Preserve Escape focus return and outside-click behavior.

## Completed: Transaction Validation

Added six integration cases, verified against SQLite and PostgreSQL 17, through the real item create/update/delete services and repositories. A test decorator flushes item changes before the event insert, then a database trigger rejects that insert. Fresh contexts verify rollback restores item state and leaves no event; paired success cases verify both writes commit. The default SQLite mode needs no Docker. The optional PostgreSQL runner applies migrations to isolated fresh databases and verifies the same scenarios on the production provider. Existing-data migration safety and broader provider queries remain separate.

## Completed: Validation Reliability

Replaced the `HttpListener` fake with Kestrel, direct ephemeral-port binding, asynchronous request capture, thread-safe snapshots, and awaited shutdown. Preserved Content-Length, raw-body, non-chunked HTTP signing, and S3 error assertions; added concurrent-endpoint isolation coverage. All 18 infrastructure tests pass on Windows and Linux (.NET SDK Docker container); see validation notes for details.

## First-pass Exit And V2 Handoff

- Complete: relational rollback coverage and the portable storage-test fixture. Results and limitations are in the validation notes; the first refactor pass is ready for V2.
- Record unresolved interaction, decomposition, and media-cleanup work as follow-ups so this pass has a bounded finish.
- Continue with [V2 Slice 1: Next.js Web Foundation](../15-v2-roadmap.md#slice-1-nextjs-web-foundation). Slice 0 decisions are already accepted; use the temporary `apps/web-v2` workspace and preserve the existing web as a reference.
- Preserve the tested filters, saved views, ownership checks, transaction behavior, and media workflows while building the collection-first experience.
- Reconcile completed transaction work with V2 Slice 7 when reaching that slice; retain its broader privacy, cleanup, import/export, and scale goals.

## Follow-up

- Audit other drawers and popovers for consistent close/focus behavior.
- Continue extracting large feature surfaces into tested units when changing them.
- Keep contributor docs aligned with the API/web-only V2 scope and actual SDK requirements.
- Add a trusted TLS storage fixture to verify the actual HTTPS `UNSIGNED-PAYLOAD` header; the current transport-failure test cannot prove that branch.
- Consider orphan-media repair and cancellation-independent compensation; current storage cleanup is best effort and uses the request cancellation token.
