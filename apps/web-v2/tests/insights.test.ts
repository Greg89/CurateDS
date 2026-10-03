// @vitest-environment node
import { describe, expect, it } from "vitest";
import { browseParams } from "@/lib/items";
import {
  restoreView,
  serializeView,
  saveViewInputSchema,
} from "@/lib/insights";
describe("insight drill-through and saved view contracts", () => {
  it("round trips exact values, UTC boundaries, missing types, and any-tag matching", () => {
    const original = new URLSearchParams({
      exactAttributeKey: "edition",
      exactAttributeValue: "A=B & C",
      createdAfter: "2026-09-01T00:00:00Z",
      createdBeforeExclusive: "2026-10-01T00:00:00Z",
      hasNoItemType: "true",
      tagMatchMode: "any",
      sortBy: "name",
      page: "4",
      view: "list",
    });
    const restored = restoreView(serializeView(original));
    expect(restored.get("exactAttributeValue")).toBe("A=B & C");
    expect(restored.get("createdBeforeExclusive")).toBe("2026-10-01T00:00:00Z");
    expect(restored.get("hasNoItemType")).toBe("true");
    expect(restored.get("tagMatchMode")).toBe("any");
    expect(restored.get("page")).toBe("1");
    expect(restored.has("view")).toBe(false);
  });
  it("supports legacy date and attribute filters without discarding them", () => {
    const restored = restoreView(
      JSON.stringify({
        createdAfter: "2026-09-01",
        attributeFilters: { colour: "Red" },
        minQuantity: 2,
      }),
    );
    expect(restored.get("createdAfter")).toBe("2026-09-01T00:00:00Z");
    expect(restored.getAll("attributeFilters")).toEqual(["colour=Red"]);
    expect(restoreView(serializeView(restored)).toString()).toBe(
      restored.toString(),
    );
  });
  it.each([
    '{"unknown":true}',
    '{"tagIds":[1]}',
    '{"hasNoTags":"true"}',
    '{"exactAttributeKey":"colour"}',
    "[]",
    '{"attributeFilters":{"colour":1}}',
  ])("refuses unsupported filters instead of broadening a view: %s", (json) => {
    expect(() => restoreView(json)).toThrow();
    expect(
      saveViewInputSchema.safeParse({ name: "Example", filtersJson: json })
        .success,
    ).toBe(false);
  });
  it.each([
    "exactAttributeKey=colour",
    "createdAfter=bad",
    "minQuantity=4&maxQuantity=2",
    "createdAfter=2026-10-01T00:00:00Z&createdBeforeExclusive=2026-09-01T00:00:00Z",
  ])("rejects invalid drill-through %s", (query) =>
    expect(() => browseParams(new URLSearchParams(query))).toThrow(),
  );
});
