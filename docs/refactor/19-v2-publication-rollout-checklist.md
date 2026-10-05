# V2 publication rollout acceptance

Prepared 2026-10-04. The user confirmed there is no deployed V2 environment yet. This is an executable acceptance plan, not a deployment record. Publishing remains disabled by default; no remote application, bucket policy, or user publication was changed.

## Prerequisites

1. Replace the existing beta web service in place using `apps/web/Dockerfile` and `/apps/web/railway.toml`; keep its domain and database/storage services. The user has rejected hosting a second client. Follow the [beta cutover plan](20-v2-beta-cutover.md), including the prior deployment recovery record. Set runtime Auth0 credentials, `API_BASE_URL`, and **`APP_BASE_URL` to the exact public HTTPS V2 origin**, with no path, query, credentials, or fragment. This configured value supplies canonical and social-image URLs; forwarded Host headers never do. Add that origin's Auth0 callback and logout URLs. Verify login/callback, consecutive refreshes, logout/session removal, and sign-in again against this environment. The current interactive live-auth script is local-only; use an explicit deployed acceptance procedure rather than treating its local pass as hosted evidence.
2. Deploy the additive API publication migration with `Publication:Enabled=false`. Preserve catalog and storage volumes. Review the [private-media handoff](15-v2-private-media-handoff.md) before changing a remote bucket. Apply `Storage:EnforcePrivateReadPolicy=true`, explicitly remove old anonymous grants, and verify a **known existing** original is readable through the authorized owner route in both clients and denied directly from storage without credentials. A missing object or healthy API is not proof of privacy.
3. Verify uploaded originals, staged derivatives, active derivatives, and retired derivatives remain in private storage. Neither a redirect nor an enduring signed URL may be used as the public delivery path. Exercise cleanup retry separately from revocation: inaccessible objects may remain until cleanup succeeds.
4. Document the actual proxy topology and trusted addresses before enabling forwarded-client-IP handling. The current API limiter uses `RemoteIpAddress`; requests from V2 reach it through the web server, so those reads share that server's bucket. Arbitrary `X-Forwarded-For` is **not trusted or forwarded** by V2. Verify per-client edge throttling and/or a deliberately sized shared API limit under expected page/image/card traffic. If true client partitions are required, configure and test an authenticated/trusted proxy chain first; do not accept caller-selected forwarding headers. Defaults are five preparations/minute/owner and 120 reads/minute/API remote address, with no queue. Card generation is additionally limited to two concurrent renders per web process.
5. Rehearse enabled publication on an isolated staging API and private bucket using a disposable collection with non-sensitive test data. Include a primary image, summary, both selected reports, and text long enough to demonstrate truncation. Confirm the owner sees the exact social card and visitor presentation before publishing. Stage-only candidates and their card/image URLs must reject anonymous and foreign-owner reads.

## Read-only edge checker

Use Node 24 from the repository root. The checker never signs in, changes a setting, or publishes/unpublishes anything. Supply the exact revision and **every distinct image token** from the active public JSON. Keep those arguments for the revocation run.

```powershell
node apps/web-v2/scripts/check-showcase-edge.mjs `
  --web-origin https://V2-WEB-ORIGIN `
  --api-origin https://PUBLIC-API-ORIGIN `
  --slug DISPOSABLE-SLUG `
  --revision REVISION-UUID `
  --asset IMAGE-UUID `
  --phase active
```

Repeat `--asset` for each image; omit it only for an edition without images. Origins must use HTTPS except for loopback rehearsals. Requests go directly to the supplied origins; redirects fail. Use the real deployed domain through its edge, not an internal service address masquerading as the public origin.

The checker exercises ordinary GET/HEAD and conditional requests for the visitor document, active JSON, exact revision JSON, social card, and every image through both delivery routes. HTML checks include a browser and Twitterbot user agent. It requires initial canonical/Open Graph metadata tied to the configured origin/revision, 1,200 × 630 PNG output, no-store/nosniff, no account cookies or redirects, no positive cached Age/HIT response, no HEAD body, and no conditional 304. It deliberately sends no request-side cache-bypass directive on the ordinary reads, so a caching edge cannot pass merely because the test forced a miss.

After the owner unpublishes through V2, rerun the **same arguments** with `--phase revoked`. Every page/JSON/image/card must now return 404; the page must omit collection metadata. A 429 means the rate window was exceeded, not that revocation passed: space runs or deliberately adjust the test environment's limits, then rerun. Preserve the terminal output, deployment revision, configured origins, and test time in the acceptance record.

## Required lifecycle checks

- Edit catalog text/settings after publishing: the document, JSON, card, and reports stay frozen. Prepare/publish an update: the canonical address stays fixed, metadata names the new revision, and old card/image/exact-revision URLs return 404. Check current resources with the active checker; probe each saved retired URL separately because the slug itself now serves the replacement.
- Prepare another candidate, then unpublish or delete source item/media/type: publication is suspended/revoked and the old candidate cannot reactivate it. Reuse the revoked checker after source removal. Verify collection deletion too. Failed publish leaves the previous edition available; a lost response can be retried only while that exact edition is still active.
- Repeat public GET/HEAD with a signed-in owner and an expired session. They must receive the same public resources, no token refresh, no new cookie, and no access to retired data. Check that arbitrary forwarded Host/Proto values do not change canonical/image origins.
- Simulate API/storage/font unavailability in staging. Affected reads must return generic 503 with no-store: API failure removes document metadata, storage failure denies the affected image, and font failure denies the card. Unaffected resources may remain available; never substitute stale content for a failed read. Check missing and malformed addresses/revisions for generic 404. Test storage denial independently of network failure.
- Run browser and bot reads through the deployed edge after unpublish acknowledgement. Exclude all `/showcase/**` resources from CDN/application caches and image optimization. Disable edge cookie injection for this public family. Existing open tabs, downloads, screenshots, and third-party preview caches cannot be recalled; confirm owner copy retains that limitation.

## Enablement and recovery

Keep production publication disabled until staging lifecycle, private-storage, configured-origin, proxy/limit, and edge checks are recorded. With an explicit production rollout authorized, enable publication for a disposable production acceptance edition, run active/revoked checks at the real edge, remove that edition, and only then release sharing to users. Failure means disable publication and investigate; never restore anonymous bucket reads to repair owner image display.

Slice 6 is complete only when the deployed acceptance record exists. A local fixture pass, successful Docker build, or social preview displayed in an owner session is not that record.
