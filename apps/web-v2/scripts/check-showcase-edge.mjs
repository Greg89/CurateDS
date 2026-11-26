import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function origin(value) {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !(
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    )
  )
    throw new Error(
      "Use an HTTPS origin, or loopback HTTP for a local rehearsal.",
    );
  return url.origin;
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
async function bounded(response, max) {
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body ?? []) {
    size += chunk.length;
    if (size > max) {
      throw new Error("Response exceeds its size bound.");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}
function meta(html, key) {
  for (const match of html.matchAll(/<meta\b[^>]*>/g)) {
    if (
      attribute(match[0], "property") === key ||
      attribute(match[0], "name") === key
    )
      return attribute(match[0], "content");
  }
}
export async function checkShowcaseEdge(
  options,
  { fetcher = fetch, log = console.log } = {},
) {
  const web = origin(options.webOrigin),
    api = origin(options.apiOrigin),
    slug = options.slug,
    revision = options.revision,
    phase = options.phase ?? "active",
    assets = options.assets ?? [];
  assert(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
      slug.length >= 3 &&
      slug.length <= 80,
    "Invalid slug.",
  );
  assert(uuid.test(revision), "An exact revision is required.");
  assert(
    ["active", "revoked"].includes(phase),
    "Phase must be active or revoked.",
  );
  assert(
    assets.every((value) => uuid.test(value)),
    "Invalid asset token.",
  );
  const resources = [
    { url: `${web}/showcase/${slug}`, kind: "html" },
    { url: `${web}/showcase/${slug}/social/${revision}`, kind: "png" },
    { url: `${api}/showcases/${slug}`, kind: "json" },
    { url: `${api}/showcases/${slug}/revisions/${revision}`, kind: "json" },
    ...assets.flatMap((asset) => [
      {
        url: `${web}/showcase/${slug}/media/${revision}/${asset}`,
        kind: "jpeg",
      },
      {
        url: `${api}/showcases/${slug}/media/${revision}/${asset}`,
        kind: "jpeg",
      },
    ]),
  ];
  for (const resource of resources) {
    for (const method of ["GET", "HEAD"]) {
      const variants =
        resource.kind === "html"
          ? ["Mozilla/5.0", "Twitterbot/1.0"]
          : ["CurateDS-Publication-Acceptance/1.0"];
      for (const userAgent of variants) {
        // Ordinary requests: no request cache-bypass directives that could conceal a bad edge policy.
        const response = await fetcher(resource.url, {
          method,
          redirect: "error",
          headers: { "User-Agent": userAgent },
          signal: AbortSignal.timeout(20000),
        });
        const label = `${method} ${resource.kind} (${userAgent.startsWith("Twitter") ? "bot" : "visitor"})`;
        assert(
          response.status === (phase === "active" ? 200 : 404),
          `${label}: unexpected status ${response.status}.`,
        );
        assert(
          /\bno-store\b/i.test(response.headers.get("cache-control") ?? ""),
          `${label}: missing no-store.`,
        );
        assert(
          response.headers.get("x-content-type-options")?.toLowerCase() ===
            "nosniff",
          `${label}: missing nosniff.`,
        );
        assert(
          !response.headers.has("set-cookie") &&
            !response.headers.has("location"),
          `${label}: account cookie or redirect.`,
        );
        assert(
          Number(response.headers.get("age") ?? 0) === 0,
          `${label}: cached response age.`,
        );
        for (const header of ["cf-cache-status", "x-vercel-cache", "x-cache"])
          assert(
            !/\bHIT\b/i.test(response.headers.get(header) ?? ""),
            `${label}: cached edge hit.`,
          );
        const bytes = await bounded(
          response,
          resource.kind === "png"
            ? 4194304
            : resource.kind === "jpeg"
              ? 1048576
              : 262144,
        );
        if (method === "HEAD")
          assert(bytes.length === 0, `${label}: HEAD returned a body.`);
        else if (phase === "active") {
          const type = response.headers.get("content-type") ?? "";
          if (resource.kind === "html") {
            assert(
              type.startsWith("text/html"),
              `${label}: incorrect content type.`,
            );
            const html = bytes.toString();
            assert(
              meta(html, "og:url") === `${web}/showcase/${slug}` &&
                meta(html, "og:image") ===
                  `${web}/showcase/${slug}/social/${revision}`,
              `${label}: metadata origin/revision mismatch.`,
            );
            assert(
              meta(html, "robots") === "noindex, nofollow" &&
                meta(html, "og:type") === "website" &&
                !!meta(html, "og:title") &&
                !!meta(html, "og:description"),
              `${label}: missing initial metadata.`,
            );
            const canonical = [...html.matchAll(/<link\b[^>]*>/g)].find(
              (match) => attribute(match[0], "rel") === "canonical",
            );
            assert(
              canonical &&
                attribute(canonical[0], "href") === `${web}/showcase/${slug}`,
              `${label}: missing canonical.`,
            );
          } else if (resource.kind === "json") {
            assert(
              type.startsWith("application/json"),
              `${label}: incorrect content type.`,
            );
            const data = JSON.parse(bytes.toString());
            assert(
              data.slug === slug && data.revisionToken === revision,
              `${label}: JSON edition mismatch.`,
            );
            const actualAssets = [
              ...(data.highlights ?? []),
              ...(data.recent ?? []),
            ]
              .map((item) => item.imageToken)
              .filter(Boolean);
            assert(
              actualAssets.every((asset) => assets.includes(asset)),
              "Pass every published image token with --asset so revocation checks cover all resources.",
            );
          } else if (resource.kind === "png")
            assert(
              type.startsWith("image/png") &&
                bytes.length >= 24 &&
                bytes
                  .subarray(0, 8)
                  .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
                bytes.readUInt32BE(16) === 1200 &&
                bytes.readUInt32BE(20) === 630,
              `${label}: invalid share card.`,
            );
          else
            assert(
              type.startsWith("image/jpeg") &&
                bytes[0] === 255 &&
                bytes[1] === 216,
              `${label}: invalid derivative.`,
            );
        } else if (resource.kind === "html")
          assert(
            !meta(bytes.toString(), "og:image") &&
              !meta(bytes.toString(), "og:title"),
            `${label}: revoked page retains public metadata.`,
          );
      }
    }
    const conditional = await fetcher(resource.url, {
      redirect: "error",
      headers: {
        "If-None-Match": "*",
        "If-Modified-Since": "Wed, 01 Jan 2098 00:00:00 GMT",
      },
      signal: AbortSignal.timeout(20000),
    });
    assert(
      conditional.status === (phase === "active" ? 200 : 404),
      `Conditional ${resource.kind}: unexpected status ${conditional.status}.`,
    );
    await conditional.body?.cancel();
    log(
      `PASS: ${phase} ${resource.kind}, GET/HEAD, cache policy, and conditional request.`,
    );
  }
  log(
    "Read-only checks passed. Storage policy and trusted proxy/rate-limit configuration still require the rollout checklist.",
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const { values } = parseArgs({
      options: {
        "web-origin": { type: "string" },
        "api-origin": { type: "string" },
        slug: { type: "string" },
        revision: { type: "string" },
        asset: { type: "string", multiple: true },
        phase: { type: "string", default: "active" },
      },
    });
    await checkShowcaseEdge({
      webOrigin: values["web-origin"],
      apiOrigin: values["api-origin"],
      slug: values.slug,
      revision: values.revision,
      assets: values.asset,
      phase: values.phase,
    });
  } catch (error) {
    console.error(
      `FAIL: ${error instanceof Error ? error.message : "Acceptance failed."}`,
    );
    process.exitCode = 1;
  }
}
