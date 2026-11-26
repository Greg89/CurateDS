// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { handleCollections } from "@/lib/collections-handler";
import { browseParams, itemInputSchema } from "@/lib/items";
import { BodyTooLarge, readBody } from "@/lib/upload";

const origin = "http://localhost:3001";
function dependencies() {
  return {
    getSession: vi.fn(async () => ({ user: { sub: "owner" } })),
    getToken: vi.fn(async () => "server-token"),
    apiBaseUrl: "http://api.test",
    appBaseUrl: origin,
    fetcher: vi.fn<typeof fetch>(
      async () => new Response(null, { status: 204 }),
    ),
  };
}
describe("item mutation boundary", () => {
  it.each(["PUT", "DELETE"])(
    "rejects cross-origin %s before accessing credentials",
    async (method) => {
      const deps = dependencies();
      const response = await handleCollections(deps, {
        request: new Request(origin, {
          method,
          headers: { origin: "https://elsewhere.test" },
        }),
      });
      expect(response.status).toBe(403);
      expect(deps.getSession).not.toHaveBeenCalled();
      expect(deps.fetcher).not.toHaveBeenCalled();
    },
  );
  it("forwards an empty primary-image update and a private 204 response", async () => {
    const deps = dependencies();
    const response = await handleCollections(deps, {
      path: "/collections/id/items/id/media/id/primary",
      request: new Request(origin, { method: "PUT", headers: { origin } }),
    });
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(deps.fetcher.mock.calls[0][1]).toMatchObject({
      method: "PUT",
      redirect: "error",
      headers: { Authorization: "Bearer server-token" },
    });
  });
  it("validates updates before forwarding them", async () => {
    const deps = dependencies();
    const response = await handleCollections(deps, {
      inputSchema: itemInputSchema,
      request: new Request(origin, {
        method: "PUT",
        headers: { origin },
        body: JSON.stringify({ name: "Valid name", quantity: -2 }),
      }),
    });
    expect(response.status).toBe(400);
    expect(deps.fetcher).not.toHaveBeenCalled();
  });
  it("rejects an unauthenticated upload before consuming its body", async () => {
    const deps = { ...dependencies(), getSession: vi.fn(async () => null) };
    const request = new Request(origin, {
      method: "POST",
      headers: { origin },
      body: "unparsed body",
    });
    expect(
      (await handleCollections(deps, { request, upload: true })).status,
    ).toBe(401);
    expect(request.bodyUsed).toBe(false);
  });
  it("forwards only the validated file with a new multipart boundary", async () => {
    const deps = dependencies();
    deps.fetcher.mockResolvedValue(
      Response.json({ accepted: true }, { status: 201 }),
    );
    const form = new FormData();
    form.set("file", new File(["image"], "photo.png", { type: "image/png" }));
    form.set("ownerId", "someone-else");
    const response = await handleCollections(deps, {
      request: new Request(origin, {
        method: "POST",
        headers: { origin },
        body: form,
      }),
      upload: true,
      schema: z.object({ accepted: z.boolean() }),
    });
    expect(response.status).toBe(201);
    const forwarded = deps.fetcher.mock.calls[0][1]!;
    expect(forwarded.body).toBeInstanceOf(FormData);
    expect([...(forwarded.body as FormData).keys()]).toEqual(["file"]);
    expect(forwarded.headers).not.toHaveProperty("Content-Type");
  });
  it.each(["text/html", "image/svg+xml", "application/octet-stream"])(
    "rejects unsupported upload %s",
    async (type) => {
      const deps = dependencies(),
        form = new FormData();
      form.set("file", new File(["content"], "file", { type }));
      expect(
        (
          await handleCollections(deps, {
            request: new Request(origin, {
              method: "POST",
              headers: { origin },
              body: form,
            }),
            upload: true,
          })
        ).status,
      ).toBe(400);
      expect(deps.fetcher).not.toHaveBeenCalled();
    },
  );
  it("rejects duplicate file fields", async () => {
    const deps = dependencies(),
      form = new FormData();
    form.append("file", new File(["image"], "one.png", { type: "image/png" }));
    form.append("file", new File(["image"], "two.png", { type: "image/png" }));
    expect(
      (
        await handleCollections(deps, {
          request: new Request(origin, {
            method: "POST",
            headers: { origin },
            body: form,
          }),
          upload: true,
        })
      ).status,
    ).toBe(400);
    expect(deps.fetcher).not.toHaveBeenCalled();
  });
  it("caps streamed bodies even when content-length is absent or understated", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(5));
        controller.enqueue(new Uint8Array(5));
      },
      cancel,
    });
    const request = new Request(origin, {
      method: "POST",
      headers: { "content-length": "1" },
      body: stream,
      duplex: "half",
    } as RequestInit);
    await expect(readBody(request, 6)).rejects.toBeInstanceOf(BodyTooLarge);
    expect(cancel).toHaveBeenCalled();
  });
  it("does not trust oversized declared lengths", async () => {
    const deps = dependencies();
    const response = await handleCollections(deps, {
      upload: true,
      request: new Request(origin, {
        method: "POST",
        headers: { origin, "content-length": String(22 * 1024 * 1024) },
      }),
    });
    expect(response.status).toBe(413);
    expect(deps.fetcher).not.toHaveBeenCalled();
  });
});
describe("browse URL contract", () => {
  it("keeps repeated tags, deduplicates, and strips unknown upstream parameters", () => {
    const tag = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const params = browseParams(
      new URLSearchParams(
        `tagIds=${tag}&tagIds=${tag}&searchText=book&ownerId=other&view=list`,
      ),
    );
    expect(params.getAll("tagIds")).toEqual([tag]);
    expect(params.has("ownerId")).toBe(false);
    expect(params.has("view")).toBe(false);
    expect(params.get("pageSize")).toBe("12");
  });
  it.each([
    "page=0",
    "pageSize=100000",
    "locationId=bad",
    "sortBy=ownerId",
    "sortDirection=sideways",
    "tagIds=bad",
  ])("rejects malformed filters: %s", (search) => {
    expect(() => browseParams(new URLSearchParams(search))).toThrow();
  });
});
