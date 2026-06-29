import { describe, expect, it } from "vitest";
import {
  buildItemFiltersSearchParams,
  hasActiveItemFilters,
  parseItemFiltersSearchParams,
  serializeItemFilters
} from "@app/api";
import {
  buildItemFiltersCacheKey,
  describeSavedView,
  tryParseSavedViewFilters
} from "@app/catalog/utils";

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

  it("returns null for malformed saved-view filters", () => {
    expect(tryParseSavedViewFilters("{bad json")).toBeNull();
    expect(tryParseSavedViewFilters('{"tagIds":"not-an-array"}')).toBeNull();
  });

  it("uses the same normalized serialization for cache keys and saved views", () => {
    const filters = {
      searchText: "  Jazz  ",
      tagIds: ["tag-b", "tag-a", "tag-a"],
      attributeFilters: {
        era: " 1950s "
      }
    };

    expect(buildItemFiltersCacheKey(filters)).toBe(serializeItemFilters(filters));
  });

  it("round-trips canonical filters through URL search params", () => {
    const filters = {
      searchText: "  Jazz  ",
      locationId: " loc-1 ",
      itemTypeId: " type-1 ",
      tagIds: ["tag-b", "tag-a", "tag-a"],
      attributeFilters: {
        era: " 1950s ",
        format: " LP "
      },
      minQuantity: 1,
      maxQuantity: 3,
      createdAfter: "2026-01-01",
      createdBefore: "2026-06-01",
      hasNoTags: true
    };

    const parsedFilters = parseItemFiltersSearchParams(buildItemFiltersSearchParams(filters));

    expect(parsedFilters).toEqual({
      searchText: "Jazz",
      locationId: "loc-1",
      itemTypeId: "type-1",
      tagIds: ["tag-a", "tag-b"],
      attributeFilters: {
        era: "1950s",
        format: "LP"
      },
      sortBy: "updatedUtc",
      sortDirection: "desc",
      minQuantity: 1,
      maxQuantity: 3,
      createdAfter: "2026-01-01",
      createdBefore: "2026-06-01",
      hasNoTags: true
    });
  });

  it("treats default-only filter state as inactive", () => {
    expect(hasActiveItemFilters({ sortBy: "updatedUtc", sortDirection: "desc" })).toBe(false);
    expect(hasActiveItemFilters({ hasNoLocation: true })).toBe(true);
  });
});
