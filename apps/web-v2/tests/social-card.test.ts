// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import {
  plainText,
  showcaseMetadata,
  showcaseOrigin,
} from "@/lib/showcase-metadata";
import { renderSocialCard } from "@/lib/social-card";
import { shapeCardLine } from "@/lib/social-card-text";
import { loadPublicShowcase } from "@/lib/public-showcase-handler";
import type { PublicShowcase } from "@/lib/publication";
const token = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const edition: PublicShowcase = {
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
describe("public showcase metadata", () => {
  it.each([
    undefined,
    "http://example.com",
    "https://u:p@example.com",
    "https://example.com/path",
    "https://example.com?x=1",
    "https://example.com/#fragment",
    "javascript:alert(1)",
  ])("rejects invalid configured origin %s", (value) =>
    expect(() => showcaseOrigin(value)).toThrow(),
  );
  it("uses the configured origin and bounded public text only", () => {
    const result = showcaseMetadata(
      { ...edition, description: "abc ".repeat(100) },
      "https://collections.example/",
    );
    expect(result.canonical).toBe(
      "https://collections.example/showcase/reading-room",
    );
    expect(result.image).toBe(
      `https://collections.example/showcase/reading-room/social/${token}`,
    );
    expect(Array.from(result.description).length).toBeLessThanOrEqual(200);
    expect(result.description).toMatch(/…$/);
    expect(showcaseOrigin("http://localhost:3001")).toBe(
      "http://localhost:3001",
    );
  });
  it("handles empty and control text without splitting a grapheme", () => {
    expect(plainText(" e\u0301 e\u0301 e\u0301 ", 4)).toBe("e\u0301 e\u0301…");
    expect(plainText("first\nsecond\u202e", 100)).toBe("first second");
    expect(
      showcaseMetadata({ ...edition, title: "   " }, "https://example.com")
        .title,
    ).toBe("Collection showcase");
  });
  it("checks the exact active revision without account headers", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(edition));
    expect(
      await loadPublicShowcase(
        edition.slug,
        { apiBaseUrl: "https://api.test", fetcher },
        token,
      ),
    ).toMatchObject({ status: 200 });
    expect(String(fetcher.mock.calls[0][0])).toBe(
      `https://api.test/showcases/reading-room/revisions/${token}`,
    );
    fetcher.mockResolvedValue(
      Response.json({
        ...edition,
        revisionToken: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      }),
    );
    expect(
      await loadPublicShowcase(
        edition.slug,
        { apiBaseUrl: "https://api.test", fetcher },
        token,
      ),
    ).toEqual({ status: 503 });
    expect(await loadPublicShowcase(edition.slug, { fetcher }, "bad")).toEqual({
      status: 404,
    });
  });
});
describe("local social-card rendering", () => {
  it.each([
    ["latin", "Stories gathered slowly", "Books & first editions"],
    ["long", "W".repeat(100), "A very long category ".repeat(5)],
    ["unicode", "Café · Ελληνικά · 日本の本 · 한국어", "世界のコレクション"],
    ["rtl", "مكتبتي الجميلة — 2026 — My library", "ספרים אהובים · Books"],
    ["empty", "   ", null],
    ["symbols", "Books 📚 <script>alert(1)</script>", null],
  ])(
    "renders %s as a bounded 1200×630 PNG without fetching assets",
    async (name, title, category) => {
      const localFetch = globalThis.fetch;
      const fetcher = vi.fn<typeof fetch>(async (input, init) => {
        if (String(input).startsWith("data:")) return localFetch(input, init);
        throw new Error("Unexpected external request");
      });
      vi.stubGlobal("fetch", fetcher);
      const response = await renderSocialCard({
        ...edition,
        title: title!,
        category,
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("content-type")).toBe("image/png");
      const png = Buffer.from(await response.arrayBuffer());
      expect(png.subarray(0, 8)).toEqual(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      );
      expect(png.readUInt32BE(16)).toBe(1200);
      expect(png.readUInt32BE(20)).toBe(630);
      expect(png.length).toBeLessThan(4 * 1024 * 1024);
      expect(
        fetcher.mock.calls.every(([url]) => String(url).startsWith("data:")),
      ).toBe(true);
      await mkdir("test-results/social-cards", { recursive: true });
      await writeFile(`test-results/social-cards/${name}.png`, png);
    },
    20000,
  );
  it("joins Arabic locally and aligns RTL runs without reversing their logical input", async () => {
    const shaped = await shapeCardLine("سلام", 60);
    expect(shaped.rtl).toBe(true);
    expect(shaped.width).toBeGreaterThan(50);
    expect((shaped.paths.match(/<path /g) || []).length).toBe(3);
  });
  it("keeps owner cards private and returns an empty checked HEAD", async () => {
    const response = await renderSocialCard(edition, true, true);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(Number(response.headers.get("content-length"))).toBeGreaterThan(
      1000,
    );
  });
});
