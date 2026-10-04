import { describe, expect, it } from "vitest";
import { publicShowcaseSchema } from "../src/lib/publication";
const id = "d59eef6e-4e42-4138-ac50-914b4f292be1";
const edition = {
  version: 1,
  slug: "reading-room",
  revisionToken: id,
  asOfUtc: "2026-10-04T12:00:00Z",
  publishedUtc: null,
  title: "Reading room",
  category: null,
  description: null,
  layout: "gallery",
  color: "forest",
  itemLabel: "book",
  itemsLabel: "books",
  showCover: true,
};
describe("public showcase allowlist", () => {
  it("accepts a review or edition with omitted optional sections", () => {
    expect(publicShowcaseSchema.parse(edition)).toEqual(edition);
    expect(
      publicShowcaseSchema.parse({ ...edition, publishedUtc: edition.asOfUtc })
        .publishedUtc,
    ).toBe(edition.asOfUtc);
  });
  it.each(["ownerId", "collectionId", "storageKey", "coverImageUrl", "email"])(
    "rejects excluded %s instead of silently passing it through",
    (field) => {
      expect(
        publicShowcaseSchema.safeParse({
          ...edition,
          [field]: "PRIVATE_SENTINEL",
        }).success,
      ).toBe(false);
    },
  );
  it("rejects workspace item fields, oversized sections, and unsupported layouts", () => {
    const item = {
      token: id,
      name: "Book",
      description: null,
      descriptionTruncated: false,
      imageToken: null,
    };
    expect(
      publicShowcaseSchema.safeParse({
        ...edition,
        highlights: [{ ...item, quantity: 42 }],
      }).success,
    ).toBe(false);
    expect(
      publicShowcaseSchema.safeParse({
        ...edition,
        highlights: Array(7).fill(item),
      }).success,
    ).toBe(false);
    expect(
      publicShowcaseSchema.safeParse({ ...edition, layout: "unknown" }).success,
    ).toBe(false);
  });
});
