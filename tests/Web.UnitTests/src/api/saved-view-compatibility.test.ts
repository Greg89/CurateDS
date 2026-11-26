import { describe, expect, it } from "vitest";
import { tryParseSerializedItemFilters } from "@app/api/items";
describe("saved view compatibility", () => {
  it("does not broaden a V2 view by dropping unsupported filters", () => {
    expect(
      tryParseSerializedItemFilters(
        JSON.stringify({
          exactAttributeKey: "edition",
          exactAttributeValue: "First",
          searchText: "book",
        }),
      ),
    ).toBeNull();
    expect(
      tryParseSerializedItemFilters(
        JSON.stringify({ createdBeforeExclusive: "2026-10-01T00:00:00Z" }),
      ),
    ).toBeNull();
    expect(
      tryParseSerializedItemFilters(
        JSON.stringify({ searchText: "book", hasNoTags: true }),
      ),
    ).toMatchObject({ searchText: "book", hasNoTags: true });
  });
});
