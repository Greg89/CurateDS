import { describe, expect, it } from "vitest";
import {
  presentationInputSchema,
  validatePresentation,
} from "@/lib/collections";
const id = "33333333-3333-4333-8333-333333333333";
const other = "44444444-4444-4444-8444-444444444444";
const flags = {
  showCover: false,
  showSummary: true,
  showPinnedItems: true,
  showRecentItems: false,
};

describe("overview presentation boundary", () => {
  it("preserves false flags and ordered pins", () => {
    expect(
      presentationInputSchema.parse({ ...flags, pinnedItemIds: [other, id] }),
    ).toEqual({ ...flags, pinnedItemIds: [other, id] });
  });
  it.each([
    null,
    [id, id],
    ["not-an-id"],
    Array.from(
      { length: 7 },
      (_, i) => `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`,
    ),
  ])("rejects invalid or oversized pin selections", (pinnedItemIds) => {
    expect(
      presentationInputSchema.safeParse({ ...flags, pinnedItemIds }).success,
    ).toBe(false);
  });
  it("requires every section choice and rejects a foreign response", () => {
    expect(
      presentationInputSchema.safeParse({ pinnedItemIds: [] }).success,
    ).toBe(false);
    expect(() =>
      validatePresentation(
        { ...flags, collectionId: other, pinnedItems: [] },
        id,
      ),
    ).toThrow();
    expect(() =>
      validatePresentation(
        {
          ...flags,
          collectionId: id,
          pinnedItems: [
            {
              id,
              collectionId: other,
              name: "Private",
              description: null,
              createdUtc: "2026-10-03T00:00:00Z",
              primaryImageUrl: null,
            },
          ],
        },
        id,
      ),
    ).toThrow();
  });
});
