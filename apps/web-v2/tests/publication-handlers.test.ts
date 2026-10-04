import { describe, it, expect, vi } from "vitest";
import { handlePublication } from "@/lib/publication-handler";
import { loadPublicShowcase, publicMedia } from "@/lib/public-showcase-handler";
import { suggestPublicationSlug } from "@/lib/publication";
const id = "33333333-3333-4333-8333-333333333333";
const token = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const edition = {
  version: 1,
  slug: "reading-room",
  revisionToken: token,
  asOfUtc: "2026-10-04T12:00:00Z",
  publishedUtc: "2026-10-04T12:01:00Z",
  title: "Reading room",
  category: null,
  description: null,
  layout: "gallery",
  color: "forest",
  itemLabel: "book",
  itemsLabel: "books",
  showCover: true,
};
const status = {
  state: "unpublished",
  slug: null,
  generation: 0,
  revisionToken: null,
  publishedUtc: null,
  suspensionReason: null,
};
const preview = {
  token,
  expiresUtc: "2026-10-04T12:30:00Z",
  generation: 0,
  showcase: { ...edition, publishedUtc: null },
  notices: [],
};
const origin = "http://localhost:3001";
function deps() {
  return {
    apiBaseUrl: "http://api.test",
    appBaseUrl: origin,
    getSession: vi.fn(async () => ({ user: "owner" })),
    getToken: vi.fn(async () => "secret"),
    fetcher: vi.fn<typeof fetch>(async () => Response.json(status)),
  };
}
function req(method = "GET", body?: unknown, requestOrigin = origin) {
  return new Request(origin, {
    method,
    headers: { origin: requestOrigin },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
describe("publication owner boundary", () => {
  it("requires same-origin mutations and a session without sending credentials upstream early", async () => {
    const d = deps();
    expect(
      (
        await handlePublication(
          req("DELETE", undefined, "https://foreign.test"),
          id,
          [],
          d,
        )
      ).status,
    ).toBe(403);
    const signedOut = { ...d, getSession: vi.fn(async () => null) };
    expect((await handlePublication(req(), id, [], signedOut)).status).toBe(
      401,
    );
    expect(d.fetcher).not.toHaveBeenCalled();
    expect(d.getToken).not.toHaveBeenCalled();
  });
  it("bounds and validates activation input and route segments", async () => {
    const d = deps();
    for (const body of [
      { candidateToken: token },
      { candidateToken: token, expectedGeneration: 0, slug: "wrong" },
      { candidateToken: "../wrong", expectedGeneration: 0 },
      { candidateToken: token, expectedGeneration: -1 },
    ])
      expect(
        (await handlePublication(req("PUT", body), id, [], d)).status,
      ).toBe(400);
    expect(
      (
        await handlePublication(
          req("PUT", { text: "x".repeat(5000) }),
          id,
          [],
          d,
        )
      ).status,
    ).toBe(413);
    expect(
      (
        await handlePublication(
          req(),
          id,
          ["previews", token, "media", ".."],
          d,
        )
      ).status,
    ).toBe(404);
    expect(
      (await handlePublication(req(), "../collections", [], d)).status,
    ).toBe(404);
    expect(d.fetcher).not.toHaveBeenCalled();
  });
  it.each([401, 403, 404, 409, 422, 429, 503, 500])(
    "maps upstream %s without disclosing diagnostics or cookies",
    async (code) => {
      const d = deps();
      d.fetcher.mockResolvedValue(
        Response.json(
          { detail: "PRIVATE_SENTINEL" },
          { status: code, headers: { "set-cookie": "private=1" } },
        ),
      );
      const response = await handlePublication(req(), id, [], d);
      expect(response.status).toBe(code === 500 ? 503 : code);
      expect(await response.text()).not.toContain("PRIVATE_SENTINEL");
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    },
  );
  it("prepares only validated input and refuses a mismatched or unsafe candidate", async () => {
    const d = deps();
    d.fetcher.mockResolvedValue(Response.json(preview));
    expect(
      (
        await handlePublication(
          req("POST", { slug: edition.slug, omitImages: true }),
          id,
          ["previews"],
          d,
        )
      ).status,
    ).toBe(201);
    expect(d.fetcher.mock.calls[0][1]).toMatchObject({
      method: "POST",
      headers: { Authorization: "Bearer secret" },
      cache: "no-store",
      redirect: "error",
      body: JSON.stringify({ slug: edition.slug, omitImages: true }),
    });
    d.fetcher.mockResolvedValue(
      Response.json({
        ...preview,
        showcase: { ...edition, slug: "different" },
      }),
    );
    expect(
      (
        await handlePublication(
          req("POST", { slug: edition.slug, omitImages: false }),
          id,
          ["previews"],
          d,
        )
      ).status,
    ).toBe(503);
    d.fetcher.mockResolvedValue(Response.json({ ...preview, token: id }));
    expect(
      (await handlePublication(req(), id, ["previews", token], d)).status,
    ).toBe(503);
  });
  it("keeps review images private and bounds derivative size", async () => {
    const d = deps();
    d.fetcher.mockResolvedValue(
      new Response(new Uint8Array([255, 216, 255, 0]), {
        headers: { "content-type": "image/jpeg", "set-cookie": "secret=1" },
      }),
    );
    const response = await handlePublication(
      req("HEAD"),
      id,
      ["previews", token, "media", id],
      d,
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
    d.fetcher.mockResolvedValue(
      new Response(new Uint8Array(1048577), {
        headers: { "content-type": "image/jpeg" },
      }),
    );
    expect(
      (await handlePublication(req(), id, ["previews", token, "media", id], d))
        .status,
    ).toBe(503);
  });
});
describe("anonymous publication boundary", () => {
  it("loads the public allowlist without cookies or authorization and without caching", async () => {
    const d = deps();
    d.fetcher.mockResolvedValue(Response.json(edition));
    expect(await loadPublicShowcase(edition.slug, d)).toEqual({
      status: 200,
      showcase: edition,
    });
    expect(String(d.fetcher.mock.calls[0][0])).toBe(
      "http://api.test/showcases/reading-room",
    );
    expect(d.fetcher.mock.calls[0][1]).toMatchObject({
      headers: { Accept: "application/json" },
      redirect: "error",
      cache: "no-store",
    });
    expect(d.getSession).not.toHaveBeenCalled();
    expect(d.getToken).not.toHaveBeenCalled();
  });
  it.each([
    { ...edition, ownerId: "PRIVATE_SENTINEL" },
    { ...edition, slug: "another" },
    { ...edition, publishedUtc: null },
    { ...edition, title: "x".repeat(66000) },
  ])("rejects invalid public payloads", async (value) => {
    const d = deps();
    d.fetcher.mockResolvedValue(Response.json(value));
    expect(await loadPublicShowcase(edition.slug, d)).toEqual({ status: 503 });
  });
  it.each([404, 401, 429, 500, 503])(
    "keeps missing and failed upstream %s generic",
    async (code) => {
      const d = deps();
      d.fetcher.mockResolvedValue(
        new Response("private diagnostics", { status: code }),
      );
      expect(await loadPublicShowcase(edition.slug, d)).toEqual({
        status: code === 404 ? 404 : 503,
      });
    },
  );
  it("rejects malformed paths and images without a storage redirect", async () => {
    const d = deps();
    expect(await loadPublicShowcase("../private", d)).toEqual({ status: 404 });
    expect((await publicMedia(edition.slug, "bad", id, false, d)).status).toBe(
      404,
    );
    expect(d.fetcher).not.toHaveBeenCalled();
    for (const type of ["image/svg+xml", "text/html", "image/png"]) {
      d.fetcher.mockResolvedValue(
        new Response("PRIVATE_SENTINEL", { headers: { "content-type": type } }),
      );
      const response = await publicMedia(edition.slug, token, id, false, d);
      expect(response.status).toBe(503);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.text()).not.toContain("PRIVATE_SENTINEL");
    }
  });
  it("supports checked GET/HEAD media and never forwards account cookies", async () => {
    const d = deps();
    d.fetcher.mockImplementation(
      async () =>
        new Response(new Uint8Array([255, 216, 255, 0]), {
          headers: { "content-type": "image/jpeg", "set-cookie": "secret=1" },
        }),
    );
    for (const head of [false, true]) {
      const response = await publicMedia(edition.slug, token, id, head, d);
      expect(response.status).toBe(200);
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect((await response.arrayBuffer()).byteLength).toBe(head ? 0 : 4);
    }
    expect(d.fetcher.mock.calls[0][1]?.headers).toEqual({
      Accept: "image/jpeg",
    });
  });
  it("suggests bounded ASCII slugs with a random fallback independent of owner IDs", () => {
    expect(suggestPublicationSlug("Café & records", "12345678")).toBe(
      "cafe-records",
    );
    expect(suggestPublicationSlug("日本語", "12345678")).toBe(
      "collection-12345678",
    );
    expect(suggestPublicationSlug("a".repeat(100), "12345678")).toHaveLength(
      80,
    );
  });
});
