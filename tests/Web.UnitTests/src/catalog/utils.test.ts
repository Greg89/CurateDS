import { describe, expect, it } from "vitest";
import { buildItemFiltersCacheKey, describeSavedView } from "@app/catalog/utils";

describe("catalog utils", () => {
  it("uses all active item filters in the cache key", () => {
    const baseKey = buildItemFiltersCacheKey({
      searchText: "Jazz",
      locationId: "loc-1",
      itemTypeId: "type-1",
      tagIds: ["tag-b", "tag-a"],
      attributeFilters: { era: "1950s" },
      sortBy: "name",
      sortDirection: "asc",
      minQuantity: 1,
      maxQuantity: 4,
      createdAfter: "2026-01-01",
      createdBefore: "2026-06-01",
      hasNoLocation: true,
      hasNoTags: false
    });

    const changedMinQuantityKey = buildItemFiltersCacheKey({
      searchText: "Jazz",
      locationId: "loc-1",
      itemTypeId: "type-1",
      tagIds: ["tag-b", "tag-a"],
      attributeFilters: { era: "1950s" },
      sortBy: "name",
      sortDirection: "asc",
      minQuantity: 2,
      maxQuantity: 4,
      createdAfter: "2026-01-01",
      createdBefore: "2026-06-01",
      hasNoLocation: true,
      hasNoTags: false
    });

    const changedQuickFilterKey = buildItemFiltersCacheKey({
      searchText: "Jazz",
      locationId: "loc-1",
      itemTypeId: "type-1",
      tagIds: ["tag-b", "tag-a"],
      attributeFilters: { era: "1950s" },
      sortBy: "name",
      sortDirection: "asc",
      minQuantity: 1,
      maxQuantity: 4,
      createdAfter: "2026-01-01",
      createdBefore: "2026-06-01",
      hasNoLocation: false,
      hasNoTags: false
    });

    expect(changedMinQuantityKey).not.toBe(baseKey);
    expect(changedQuickFilterKey).not.toBe(baseKey);
  });

  it("normalizes logically equivalent filters to the same cache key", () => {
    const left = buildItemFiltersCacheKey({
      searchText: "  Jazz  ",
      tagIds: ["tag-b", "tag-a", "tag-a"],
      attributeFilters: {
        era: " 1950s ",
        " ": "ignored"
      }
    });

    const right = buildItemFiltersCacheKey({
      searchText: "Jazz",
      tagIds: ["tag-a", "tag-b"],
      attributeFilters: {
        era: "1950s"
      }
    });

    expect(left).toBe(right);
  });

  it("includes the item type in the saved view description", () => {
    const description = describeSavedView({
      itemTypeId: "vinyl",
      sortBy: "updatedUtc",
      sortDirection: "desc"
    });

    expect(description).toContain("Item type scoped");
  });
});
