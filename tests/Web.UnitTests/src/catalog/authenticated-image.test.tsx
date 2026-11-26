import { afterEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  AuthenticatedImage,
  loadMedia,
} from "@app/catalog/components/AuthenticatedImage";
import { authHeader } from "@app/api/http";
vi.mock("@app/api/http", () => ({
  apiBase: "https://api.test",
  authHeader: vi.fn(async () => ({ Authorization: "Bearer secret" })),
}));
const path =
  "/collections/33333333-3333-4333-8333-333333333333/items/11111111-1111-4111-8111-111111111111/media/22222222-2222-4222-8222-222222222222/content";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("only sends the bearer token to a scoped API content path", async () => {
  const fetcher = vi.fn(
    async () =>
      new Response(new Uint8Array([1, 2]), {
        headers: { "Content-Type": "image/png" },
      }),
  );
  vi.stubGlobal("fetch", fetcher);
  for (const invalid of [
    "https://evil.test/image.png",
    "//evil.test/image.png",
    path + "?url=https://evil.test",
    "/collections/../content",
  ])
    await expect(
      loadMedia(invalid, new AbortController().signal),
    ).rejects.toThrow("Invalid media path");
  expect(authHeader).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
  expect((await loadMedia(path, new AbortController().signal)).size).toBe(2);
  expect(fetcher).toHaveBeenCalledWith(
    `https://api.test${path}`,
    expect.objectContaining({
      headers: { Authorization: "Bearer secret" },
      redirect: "error",
      cache: "no-store",
    }),
  );
});
it("revokes image object URLs when navigating away", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(new Uint8Array([1]), {
          headers: { "Content-Type": "image/png" },
        }),
    ),
  );
  const create = vi.fn(() => "blob:private-image");
  const revoke = vi.fn();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: create,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revoke,
  });
  const view = render(<AuthenticatedImage src={path} alt="Photo" />);
  await waitFor(() =>
    expect(screen.getByRole("img", { name: "Photo" })).toHaveAttribute(
      "src",
      "blob:private-image",
    ),
  );
  view.unmount();
  expect(revoke).toHaveBeenCalledWith("blob:private-image");
});
it("rejects unsafe formats and expired access without producing a blob URL", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response("<svg/>", {
          headers: { "Content-Type": "image/svg+xml" },
        }),
    ),
  );
  await expect(loadMedia(path, new AbortController().signal)).rejects.toThrow(
    "Invalid image response",
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status: 401 })),
  );
  render(<AuthenticatedImage src={path} alt="Photo" />);
  expect(
    await screen.findByRole("img", { name: "Photo: image unavailable" }),
  ).toBeInTheDocument();
});
