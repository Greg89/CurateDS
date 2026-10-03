import { describe, expect, it, vi } from "vitest";
import { handleCollections } from "@/lib/collections-handler";
import {
  collectionSchema,
  createCollectionSchema,
  createItemSchema,
  itemReceiptSchema,
} from "@/lib/collections";

const collection = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Books",
  createdUtc: "2026-10-02T00:00:00Z",
};
function dependencies() {
  return {
    getSession: vi.fn(async () => ({ user: { sub: "owner" } })),
    getToken: vi.fn(async () => "private-token"),
    apiBaseUrl: "http://api.example",
    fetcher: vi.fn<typeof fetch>(async () => Response.json([collection])),
  };
}
describe("collection API boundary", () => {
  it("requires a session before requesting a token or calling the API", async () => {
    const deps = { ...dependencies(), getSession: vi.fn(async () => null) };
    const response = await handleCollections(deps);
    expect(response.status).toBe(401);
    expect(deps.getToken).not.toHaveBeenCalled();
    expect(deps.fetcher).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("keeps the bearer token server-side and disables caching and redirects", async () => {
    const deps = dependencies();
    const response = await handleCollections(deps);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { ...collection, itemLabel: "item", itemsLabel: "items" },
    ]);
    const [url, options] = deps.fetcher.mock.calls[0];
    expect(String(url)).toBe("http://api.example/collections");
    expect(options).toMatchObject({
      headers: { Authorization: "Bearer private-token" },
      cache: "no-store",
      redirect: "error",
    });
  });
  it.each([401, 403, 500])(
    "maps upstream %s without leaking its response",
    async (status) => {
      const deps = dependencies();
      deps.fetcher.mockResolvedValue(
        new Response("sensitive diagnostics", { status }),
      );
      const response = await handleCollections(deps);
      expect(response.status).toBe(status === 500 ? 502 : status);
      expect(await response.text()).not.toContain("sensitive");
    },
  );
  it.each([
    [{ ...collection, id: "invalid" }],
    { rows: [] },
    [{ ...collection, createdUtc: "yesterday" }],
  ])("rejects malformed collection responses", async (body) => {
    const deps = dependencies();
    deps.fetcher.mockResolvedValue(Response.json(body));
    expect((await handleCollections(deps)).status).toBe(502);
  });
  it("handles expired tokens without calling the upstream API", async () => {
    const deps = dependencies();
    deps.getToken.mockRejectedValue(new Error("private refresh details"));
    expect((await handleCollections(deps)).status).toBe(401);
    expect(deps.fetcher).not.toHaveBeenCalled();
  });
  it("returns a recoverable error on network failure", async () => {
    const deps = dependencies();
    deps.fetcher.mockRejectedValue(new TypeError("network details"));
    const response = await handleCollections(deps);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("network details");
  });
  it("does not call an unconfigured API", async () => {
    const deps = { ...dependencies(), apiBaseUrl: undefined };
    expect((await handleCollections(deps)).status).toBe(503);
    expect(deps.fetcher).not.toHaveBeenCalled();
  });
});

describe("collection writes", () => {
  const origin = "http://localhost:3001";
  function post(body: unknown, requestOrigin: string | null = origin) {
    return new Request(`${origin}/api/collections`, {
      method: "POST",
      headers: requestOrigin ? { Origin: requestOrigin } : {},
      body: JSON.stringify(body),
    });
  }
  it.each([null, "https://untrusted.example"])(
    "rejects a write with origin %s before using credentials",
    async (requestOrigin) => {
      const deps = { ...dependencies(), appBaseUrl: origin };
      const response = await handleCollections(deps, {
        request: post({ name: "Books" }, requestOrigin),
        inputSchema: createCollectionSchema,
      });
      expect(response.status).toBe(403);
      expect(deps.getToken).not.toHaveBeenCalled();
      expect(deps.fetcher).not.toHaveBeenCalled();
    },
  );
  it("requires authentication for same-origin writes", async () => {
    const deps = {
      ...dependencies(),
      appBaseUrl: origin,
      getSession: vi.fn(async () => null),
    };
    expect(
      (
        await handleCollections(deps, {
          request: post({ name: "Books" }),
          inputSchema: createCollectionSchema,
        })
      ).status,
    ).toBe(401);
    expect(deps.fetcher).not.toHaveBeenCalled();
  });
  it.each([
    { name: " " },
    { name: "Books", coverImageUrl: "javascript:alert(1)" },
    { name: "Books", color: "unknown" },
  ])("rejects invalid creation input", async (body) => {
    const deps = { ...dependencies(), appBaseUrl: origin };
    expect(
      (
        await handleCollections(deps, {
          request: post(body),
          inputSchema: createCollectionSchema,
        })
      ).status,
    ).toBe(400);
    expect(deps.fetcher).not.toHaveBeenCalled();
  });
  it("forwards only validated fields and returns a validated created collection", async () => {
    const deps = { ...dependencies(), appBaseUrl: origin };
    deps.fetcher.mockResolvedValue(
      Response.json(
        { ...collection, description: "Stories", private: "diagnostics" },
        { status: 201 },
      ),
    );
    const response = await handleCollections(deps, {
      request: post({
        name: " Books ",
        description: "Stories",
        ownerId: "another-user",
      }),
      inputSchema: createCollectionSchema,
      schema: collectionSchema,
    });
    expect(response.status).toBe(201);
    expect(deps.fetcher.mock.calls[0][1]?.body).toBe(
      JSON.stringify({ name: "Books", description: "Stories" }),
    );
    expect(await response.text()).not.toContain("diagnostics");
  });
  it("keeps API validation failures safe and does not retry a write", async () => {
    const deps = { ...dependencies(), appBaseUrl: origin };
    deps.fetcher.mockResolvedValue(
      Response.json({ private: "diagnostics" }, { status: 400 }),
    );
    const response = await handleCollections(deps, {
      request: post({ name: "New item", quantity: 1 }),
      path: `/collections/${collection.id}/items`,
      inputSchema: createItemSchema,
      schema: itemReceiptSchema,
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: "invalid_request" });
    expect(deps.fetcher).toHaveBeenCalledTimes(1);
  });
});
