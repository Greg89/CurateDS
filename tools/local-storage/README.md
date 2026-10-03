# Local media storage

This opt-in Compose override connects the local API to an S3-compatible MinIO service. It persists files in the named volume `curateds-local-media`; its only published port is `127.0.0.1:9000`. The browser console is disabled. Credentials in the override are development fixtures, not production secrets.

From the repository root:

```powershell
docker compose -f compose.yaml -f compose.media.yaml up -d --build catalog-storage catalog-api
```

The first build downloads Go dependencies and compiles MinIO, so it can take several minutes. Later starts use the cached image. The API initializes the `curateds-local-media` bucket and its existing anonymous image-read policy; uploads/deletes still pass through the authenticated API. Image URLs work on this computer at `http://localhost:9000`. This override does not connect remote storage or change deployment configuration.

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

The test uses the real storage adapter and an in-memory API with test authentication. It creates a uniquely named bucket, checks upload/public read, primary selection, media preservation after editing, browse thumbnails, and deletion, then deletes its bucket. It never adds data to the user's local database. Without the flag this test is explicitly skipped.

## Source

The Dockerfile builds the pinned [MinIO RELEASE.2025-10-15T17-29-55Z](https://github.com/minio/minio/releases/tag/RELEASE.2025-10-15T17-29-55Z) using the project's documented source-install method. The community repository is archived; this is a development fixture, not a new production storage recommendation. MinIO's AGPL license is included in the image. Production storage/privacy decisions remain in V2 Slice 7.
