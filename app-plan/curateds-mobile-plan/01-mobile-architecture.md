# Mobile Architecture

## Stack

- **Framework**: React Native + Expo (managed workflow). Aligns with [01-technical-direction.md](../01-technical-direction.md): "React web now, React Native later."
- **Language**: TypeScript, `strict` on.
- **Navigation**: React Navigation (stack + bottom tabs).
- **Server state**: TanStack Query — same library and patterns the web app already uses, allowing query/mutation hook shapes to be ported with minimal change.
- **Local state**: Zustand for cross-screen UI state (current collection, draft item, sync indicator).
- **Persistent cache**: TanStack Query persistence + a thin AsyncStorage wrapper for the offline write queue.
- **Image storage**: Expo FileSystem for camera captures awaiting upload; the API/MinIO is the canonical store once synced.
- **Auth**: Auth0 via `react-native-auth0` (or `expo-auth-session`) using the **same Auth0 tenant and API audience** the web app uses, but a **new native application registration** in Auth0 with PKCE. The existing SPA client cannot be reused for native.
- **Token storage**: `expo-secure-store` (Keychain / EncryptedSharedPreferences). Never AsyncStorage.

## Repository Placement

When implementation begins, the mobile project lives at `apps/mobile/` — same level as `apps/api/` and `apps/web/`. It does **not** live under `app-plan/`. The `app-plan/curateds-mobile-plan/` folder is documentation only.

## Data Flow

The mobile app is a **read-through cache + write-behind queue** over the existing HTTP API. There is no mobile-specific backend.

### Reads

1. UI renders from TanStack Query cache.
2. On mount, the query refetches from the API. If offline, the persisted cache is returned.
3. Image URLs from `MediaAsset.publicUrl` are loaded through Expo's image cache; thumbnails are pre-warmed when an item appears in a list.

### Writes

1. The user submits a mutation (create item, edit item, upload media, etc.).
2. The mutation is added to the local write queue with a stable client-generated `operationId`.
3. TanStack Query applies an **optimistic update** to the cache so the UI reflects the change immediately.
4. A sync worker drains the queue against the real API:
    - On success, the optimistic entry is replaced by the server response.
    - On 4xx, the operation is marked failed and surfaced to the user (the rejection reason is shown; the queued item is removed).
    - On 5xx or network error, the operation is retried with exponential backoff.
5. **Conflict policy: last-write-wins** at the item level. If the local op's baseline `UpdatedUtc` is older than the server's, the user is shown a one-time toast — "this item was updated elsewhere; your changes were applied on top." No interactive merge in MVP.

### Media Uploads

1. The camera/gallery image is written to Expo FileSystem with a `pendingMediaId`.
2. A media-upload op is queued.
3. On success, the server returns a `MediaAsset` with its CDN URL; the local file is deleted, and the optimistic asset entry is replaced.
4. On failure, the file remains on disk and the upload op stays queued.

## API Surface Used By Mobile

Mobile consumes a strict subset of the existing endpoints. **No new endpoints are required for MVP.** Authoritative source: [apps/api/Collections/CollectionEndpoints.cs](../../apps/api/Collections/CollectionEndpoints.cs).

| Operation | Endpoint |
|---|---|
| List collections | `GET /collections` |
| List items | `GET /collections/{collectionId}/items` (paginated) |
| Item detail | `GET /collections/{collectionId}/items/{itemId}` |
| Create item | `POST /collections/{collectionId}/items` |
| Update item | `PUT /collections/{collectionId}/items/{itemId}` |
| Delete item | `DELETE /collections/{collectionId}/items/{itemId}` |
| Item events | `GET /collections/{collectionId}/items/{itemId}/events` |
| Upload media | `POST /collections/{collectionId}/items/{itemId}/media` |
| Delete media | `DELETE /collections/{collectionId}/items/{itemId}/media/{mediaAssetId}` |
| Set primary media | `PUT /collections/{collectionId}/items/{itemId}/media/{mediaAssetId}/primary` |
| List tags | `GET /tags` |
| Create tag (inline) | `POST /tags` |
| List locations | `GET /locations` |
| Create location (inline) | `POST /locations` |
| List attribute definitions | `GET /collections/{collectionId}/attribute-definitions` |

Endpoints **not** consumed by mobile MVP: anything mutating collections, attribute definitions,
or standalone tag/location management. Those remain web-only.

## Contracts

Mobile uses the same response and error shapes the web does (see [docs/api-contracts.md](../../docs/api-contracts.md)):

- Success responses are resource-specific DTOs (`CollectionResponse`, `ItemDetailResponse`, etc.).
- Errors are RFC 7807 Problem Details with the existing problem-type URNs:
    - `urn:curateds:problem:validation` (400)
    - `urn:curateds:problem:conflict` (409)
    - `urn:curateds:problem:not-found` (404)
- Mobile maps these to user-facing toasts/dialogs by `code` in `extensions`, not by parsing English text.

When the items endpoint becomes paginated server-side (per "Future Pagination Contract" in
[docs/api-contracts.md](../../docs/api-contracts.md)), mobile consumes the
`{ items, page, pageSize, totalCount }` shape directly. Mobile does not require its own pagination
contract.

## Logging And Correlation

Mobile sends `X-Correlation-ID` (a client-generated GUID per logical user action) on every
request. The API already echoes this header back and includes it in every Serilog event
(see [apps/api/Observability/CorrelationIdMiddleware.cs](../../apps/api/Observability/CorrelationIdMiddleware.cs)),
so a failed mobile sync can be traced end-to-end in Seq using the ID surfaced in the mobile error toast.

Client-side errors that don't reach the server (crashes, JS exceptions) go to Sentry. Sentry
events tag the same correlation ID when one was in flight.

## Security

- No long-lived API keys on device. Access tokens come from Auth0 and are stored in `expo-secure-store`.
- Refresh tokens use Auth0 rotation; the previous token is invalidated on refresh.
- A biometric gate is optional and **purely a local UX lock**, not a second authentication factor. A user without biometrics still has full functionality after Auth0 sign-in.
- The MinIO/CDN URLs in `MediaAsset.publicUrl` follow whatever access policy the backend has configured. The mobile app does not reimplement signing.

## Out Of Scope (Architecture)

- No GraphQL layer.
- No mobile BFF.
- No SQLite or WatermelonDB. AsyncStorage + TanStack Query persistence is sufficient for the expected dataset size (single-user catalogs, low thousands of items). Revisit if profiling proves otherwise.
- No background sync via native task schedulers at MVP; sync runs on app foreground and via in-app activity. Background tasks are a follow-up.
