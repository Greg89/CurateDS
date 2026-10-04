import { describe, expect, it, vi } from "vitest";
import { handleCollections } from "@/lib/collections-handler";
import { maxImageBytes } from "@/lib/upload";

const path =
  "/collections/33333333-3333-4333-8333-333333333333/items/11111111-1111-4111-8111-111111111111/media/22222222-2222-4222-8222-222222222222/content";
function dependencies(response: Response) {
  return {
    apiBaseUrl: "https://api.test",
    getSession: vi.fn(async () => ({ user: {} })),
    getToken: vi.fn(async () => "secret"),
    fetcher: vi.fn(async () => response),
  };
}
describe("private media BFF", () => {
  it("checks the session, forwards only the server token, and returns bounded uncached bytes", async () => {
    const deps = dependencies(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: {
          "Content-Type": "image/png",
          ETag: "private-etag",
          "Set-Cookie": "upstream-secret",
        },
      }),
    );
    const result = await handleCollections(deps, { path, mediaRead: true });
    expect(result.status).toBe(200);
    expect([...new Uint8Array(await result.arrayBuffer())]).toEqual([1, 2, 3]);
    expect(deps.fetcher).toHaveBeenCalledWith(
      new URL(`https://api.test${path}`),
      expect.objectContaining({
        cache: "no-store",
        redirect: "error",
        headers: expect.objectContaining({ Authorization: "Bearer secret" }),
      }),
    );
    expect(result.headers.get("cache-control")).toBe("private, no-store");
    expect(result.headers.get("x-content-type-options")).toBe("nosniff");
    expect(result.headers.has("set-cookie")).toBe(false);
    expect(result.headers.has("etag")).toBe(false);
    const blocked = {
      ...deps,
      getSession: vi.fn(async () => null),
      fetcher: vi.fn(),
    };
    expect(
      (await handleCollections(blocked, { path, mediaRead: true })).status,
    ).toBe(401);
    expect(blocked.fetcher).not.toHaveBeenCalled();
  });
  it.each([401, 403, 404, 500])(
    "keeps upstream status %s failures private",
    async (status) => {
      const result = await handleCollections(
        dependencies(new Response("storage-secret", { status })),
        { path, mediaRead: true },
      );
      expect(result.status).toBe(status === 500 ? 502 : status);
      expect(result.headers.get("cache-control")).toContain("no-store");
      expect(await result.text()).not.toContain("storage-secret");
    },
  );
  it("rejects active formats and over-limit bodies even without Content-Length", async () => {
    const svg = await handleCollections(
      dependencies(
        new Response("<svg/>", {
          headers: { "Content-Type": "image/svg+xml" },
        }),
      ),
      { path, mediaRead: true },
    );
    expect(svg.status).toBe(502);
    const cancelled = vi.fn();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(maxImageBytes));
        controller.enqueue(new Uint8Array(1));
      },
      cancel: cancelled,
    });
    const result = await handleCollections(
      dependencies(
        new Response(body, { headers: { "Content-Type": "image/png" } }),
      ),
      { path, mediaRead: true },
    );
    expect(result.status).toBe(502);
    expect(cancelled).toHaveBeenCalled();
  });
});
