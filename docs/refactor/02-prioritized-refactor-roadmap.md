# Prioritized Refactor Roadmap

Status updated: 2026-10-02

The June roadmap predates merged implementation. Use this status when resuming; see the app-plan folder for the broader V2 plan.

## Completed implementation

- Filter/query symmetry, saved-view restoration and malformed-row handling.
- Drawer unmount fix.
- Saved-view write validation with application and API coverage.
- Application unit-of-work abstraction and EF transaction implementation, used by item and other catalog write services.
- Best-effort media-upload compensation after database failure.
- Baseline tag-picker outside-click and Escape handling.

## Current continuation: Tag Picker Focus

- Focus the first checkbox when opening.
- Keep native Tab/Shift+Tab and Space interaction for the checkbox group.
- Close when focus leaves without stealing focus from the destination.
- Close and reset when disabled, preventing the clear action from remaining interactive.
- Preserve Escape focus return and outside-click behavior.

## Next: Transaction Validation

Add a relational fixture and force a failure after staging item state/event changes. Verify from a fresh context that no partial write persists. Cover create, update, and delete as appropriate. EF InMemory service/API tests do not establish rollback behavior.

## Next: Validation Reliability

Replace the `HttpListener`-based fake S3 endpoint with a portable server fixture. Preserve checks for Content-Length, chunked encoding, and payload-signing compatibility. Run the infrastructure suite on supported development/CI hosts.

## Follow-up

- Audit other drawers and popovers for consistent close/focus behavior.
- Continue extracting large feature surfaces into tested units when changing them.
- Keep contributor docs aligned with the API/web-only V2 scope and actual SDK requirements.
- Consider orphan-media repair and cancellation-independent compensation; current storage cleanup is best effort and uses the request cancellation token.
