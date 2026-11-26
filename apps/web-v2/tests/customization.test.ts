import { describe, expect, it } from "vitest";
import {
  vocabularyInputSchema,
  createFieldInputSchema,
  fieldInputSchema,
  vocabulary,
} from "../src/lib/customization";
import { collectionSchema } from "../src/lib/collections";
describe("collection customization", () => {
  it("normalizes labels and keeps legacy collection defaults", () => {
    expect(
      vocabularyInputSchema.parse({
        itemLabel: " book ",
        itemsLabel: " books ",
      }),
    ).toEqual({ itemLabel: "book", itemsLabel: "books" });
    const collection = collectionSchema.parse({
      id: "33333333-3333-4333-8333-333333333333",
      name: "Books",
      createdUtc: "2026-10-02T00:00:00Z",
    });
    expect(vocabulary(collection).add).toBe("Add an item");
    expect(
      vocabulary({
        ...collection,
        itemLabel: "artwork",
        itemsLabel: "artworks",
      }).add,
    ).toBe("Add artwork");
  });
  it.each(["", "  ", "a".repeat(41), "book\n", "bo\tok", "book\u0085"])(
    "rejects invalid labels %j",
    (value) => {
      expect(
        vocabularyInputSchema.safeParse({
          itemLabel: value,
          itemsLabel: "books",
        }).success,
      ).toBe(false);
    },
  );
  it("requires explicit field choices and ignores immutable type on update", () => {
    const field = {
      name: " Maker ",
      dataType: "Text",
      isRequired: true,
      isFilterable: false,
      itemTypeId: null,
    };
    expect(createFieldInputSchema.parse(field).name).toBe("Maker");
    expect(fieldInputSchema.parse(field)).not.toHaveProperty("dataType");
    expect(
      createFieldInputSchema.safeParse({ ...field, dataType: "Unknown" })
        .success,
    ).toBe(false);
    expect(
      createFieldInputSchema.safeParse({ ...field, isRequired: undefined })
        .success,
    ).toBe(false);
    expect(
      createFieldInputSchema.safeParse({
        ...field,
        itemTypeId: "another-collection",
      }).success,
    ).toBe(false);
  });
});
