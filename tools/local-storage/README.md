# Local media storage

This opt-in Compose override connects the local API to an S3-compatible MinIO service. It persists files in the named volume `curateds-local-media`; its only published port is `127.0.0.1:9000`. The browser console is disabled. Credentials in the override are development fixtures, not production secrets.

From the repository root:

```powershell
docker compose -f compose.yaml -f compose.media.yaml up -d --build catalog-storage catalog-api catalog-web
```

The first build downloads Go dependencies and compiles MinIO, so it can take several minutes. Later starts use the cached image. The API initializes the `curateds-local-media` bucket and explicitly removes its bucket policy with `Storage__EnforcePrivateReadPolicy=true`. Existing direct image URLs on port 9000 are denied. Both web clients read media through authenticated API paths; restart V2 if it is running. Startup fails if private-policy enforcement fails. This override does not connect remote storage or change deployment configuration.

Use both Compose files on subsequent API starts to retain storage configuration. Running only the base Compose file recreates the API without these settings. To stop storage without deleting files:

```powershell
docker compose -f compose.yaml -f compose.media.yaml stop catalog-storage
```

Do not use `down --volumes` unless you intend to delete database and media volumes.

## Acceptance check

Start the storage service, then run the isolated real-storage test:

```powershell
$env:CURATEDS_TEST_LOCAL_MEDIA = '1'
dotnet test tests/Api.IntegrationTests --filter FullyQualifiedName~LocalMediaAcceptanceTests
Remove-Item Env:CURATEDS_TEST_LOCAL_MEDIA
```

The test uses the real storage adapter and an in-memory API with test authentication. It creates a uniquely named bucket, first creates an old public object, verifies its URL is denied after policy removal, then checks authenticated upload/read, anonymous API denial, primary selection, media preservation after editing, browse thumbnails, and deletion, then deletes its bucket. It never adds data to the user's local database. Without the flag this test is explicitly skipped.

## Source

The Dockerfile builds the pinned [MinIO RELEASE.2025-10-15T17-29-55Z](https://github.com/minio/minio/releases/tag/RELEASE.2025-10-15T17-29-55Z) using the project's documented source-install method. The community repository is archived; this is a development fixture, not a new production storage recommendation. MinIO's AGPL license is included in the image. The minimum private media-read path is part of V2 Slice 6. Broader cleanup and scale work remain in Slice 7.

## Remote rollout

Deploy the updated API and both clients together: `url` and `primaryImageUrl` now contain API-relative `/collections/{collectionId}/items/{itemId}/media/{assetId}/content` paths. V2 adds its `/api` session boundary; the legacy client fetches with its bearer token and revokes temporary blob URLs on unmount. Old clients using plain image tags against direct storage URLs are incompatible with private storage.

`EnablePublicReadPolicy` now defaults to false. This avoids adding a grant but does not remove an existing one. After the new clients are available, explicitly enable `EnforcePrivateReadPolicy` for the dedicated catalog bucket; it overrides the legacy public-read switch and removes the entire bucket policy. The storage identity needs permission to delete that policy. Verify actual anonymous reads fail, including any external ACL/CDN access configured outside this repository, and verify authenticated display before completing rollout. `PublicBaseUrl` is no longer consumed.

No remote policy is changed by this work. To recover an owner-display problem, repair the authenticated path or pause the deployment; do not restore anonymous bucket reads. The policy transition does not delete stored files. Previously downloaded or cached images cannot be recalled. External collection-cover links retain their existing behavior; uploaded catalog media is the scope of this change.