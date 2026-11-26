// @vitest-environment node
import { it, expect, vi } from "vitest";
import { checkShowcaseEdge } from "../scripts/check-showcase-edge.mjs";
const revision = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  asset = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const options = {
  webOrigin: "https://web.test",
  apiOrigin: "https://api.test",
  slug: "reading-room",
  revision,
};
const html = `<head><meta name="robots" content="noindex, nofollow"><meta property="og:type" content="website"><meta property="og:title" content="Reading room"><meta property="og:description" content="A story"><meta property="og:url" content="https://web.test/showcase/reading-room"><meta property="og:image" content="https://web.test/showcase/reading-room/social/${revision}"><link rel="canonical" href="https://web.test/showcase/reading-room"></head>`;
function fixture(change?: {
  cache?: string;
  cookie?: string;
  age?: string;
  conditional?: number;
  assets?: boolean;
  revoked?: boolean;
}) {
  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input),
      isHtml = url === "https://web.test/showcase/reading-room",
      isPng = url.includes("/social/"),
      isMedia = url.includes("/media/");
    const headers = new Headers({
      "Cache-Control": change?.cache ?? "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Type": isHtml
        ? "text/html"
        : isPng
          ? "image/png"
          : isMedia
            ? "image/jpeg"
            : "application/json",
    });
    if (change?.cookie) headers.set("set-cookie", change.cookie);
    if (change?.age) headers.set("age", change.age);
    const status =
      change?.conditional && new Headers(init?.headers).has("if-none-match")
        ? change.conditional
        : change?.revoked
          ? 404
          : 200;
    if (init?.method === "HEAD" || status === 304)
      return new Response(null, { status, headers });
    const png = Buffer.alloc(24);
    png.set([137, 80, 78, 71, 13, 10, 26, 10]);
    png.writeUInt32BE(1200, 16);
    png.writeUInt32BE(630, 20);
    const body = change?.revoked
      ? "Unavailable"
      : isHtml
        ? html
        : isPng
          ? png
          : isMedia
            ? Buffer.from([255, 216, 255])
            : JSON.stringify({
                slug: options.slug,
                revisionToken: revision,
                ...(change?.assets
                  ? { highlights: [{ imageToken: asset }] }
                  : {}),
              });
    return new Response(body, { status, headers });
  });
}
it("checks both origins, bots, GET/HEAD and conditional reads without writes or cache bypass", async () => {
  const fetcher = fixture();
  await checkShowcaseEdge(options, { fetcher, log: () => {} });
  expect(
    fetcher.mock.calls.some(
      ([, init]) =>
        new Headers(init?.headers).get("user-agent") === "Twitterbot/1.0",
    ),
  ).toBe(true);
  expect(
    fetcher.mock.calls.every(
      ([, init]) => !init?.method || ["GET", "HEAD"].includes(init.method),
    ),
  ).toBe(true);
  expect(
    fetcher.mock.calls.every(
      ([, init]) =>
        !new Headers(init?.headers).has("cache-control") &&
        !new Headers(init?.headers).has("authorization"),
    ),
  ).toBe(true);
});
it.each([
  { cache: "public, max-age=600" },
  { cookie: "session=secret" },
  { age: "1" },
  { conditional: 304 },
])("fails for unsafe edge response %j", async (change) => {
  await expect(
    checkShowcaseEdge(options, { fetcher: fixture(change), log: () => {} }),
  ).rejects.toThrow();
});
it("requires every asset from the active edition and can check its revoked state", async () => {
  await expect(
    checkShowcaseEdge(options, {
      fetcher: fixture({ assets: true }),
      log: () => {},
    }),
  ).rejects.toThrow("every published image");
  await checkShowcaseEdge(
    { ...options, assets: [asset] },
    { fetcher: fixture({ assets: true }), log: () => {} },
  );
  await checkShowcaseEdge(
    { ...options, assets: [asset], phase: "revoked" },
    { fetcher: fixture({ revoked: true }), log: () => {} },
  );
});
