import { describe, expect, it } from "vitest";
import {
  ItemSummarySchema,
  PagedItemsSchema,
  ItemDetailSchema,
  ItemEventSchema,
} from "../src/items";
import {
  CollectionSchema,
  CollectionSummarySchema,
  CollectionActivityEventSchema,
} from "../src/collections";
import {
  AttributeDataTypeSchema,
  AttributeDefinitionSchema,
} from "../src/attributes";
import { TagSchema } from "../src/tags";
import { LocationSchema } from "../src/locations";
import { ItemTypeSchema } from "../src/item-types";
import { SavedViewSchema } from "../src/saved-views";
import { MediaAssetSchema } from "../src/media";

const expectZodError = (parse: () => unknown) => {
  let thrown: unknown;

  try {
    parse();
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toMatchObject({
    name: "ZodError",
    issues: expect.any(Array),
  });
};

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const validItemSummary = {
  id: "33333333-3333-3333-3333-333333333333",
  collectionId: "11111111-1111-1111-1111-111111111111",
  name: "Kind of Blue",
  description: "Mono pressing",
  quantity: 1,
  locationId: null,
  locationName: null,
  tags: [],
  attributeValueCount: 1,
  createdUtc: "2026-04-20T00:10:00Z",
  updatedUtc: "2026-04-20T00:20:00Z",
  primaryImageUrl: null,
};

// ---------------------------------------------------------------------------
// ItemSummarySchema
// ---------------------------------------------------------------------------

describe("ItemSummarySchema", () => {
  it("parses a valid item summary", () => {
    const result = ItemSummarySchema.parse(validItemSummary);
    expect(result.name).toBe("Kind of Blue");
  });

  it("accepts updatedUtc as null (new item not yet updated)", () => {
    const result = ItemSummarySchema.parse({ ...validItemSummary, updatedUtc: null });
    expect(result.updatedUtc).toBeNull();
  });

  it("accepts primaryImageUrl as null", () => {
    const result = ItemSummarySchema.parse({ ...validItemSummary, primaryImageUrl: null });
    expect(result.primaryImageUrl).toBeNull();
  });

  it("accepts primaryImageUrl as a URL string", () => {
    const result = ItemSummarySchema.parse({
      ...validItemSummary,
      primaryImageUrl: "https://cdn.example.com/img.jpg",
    });
    expect(result.primaryImageUrl).toBe("https://cdn.example.com/img.jpg");
  });

  it("throws ZodError when name is missing", () => {
    const { name: _name, ...withoutName } = validItemSummary;
    expectZodError(() => ItemSummarySchema.parse(withoutName));
  });

  it("throws ZodError when quantity is not a number", () => {
    expectZodError(() => ItemSummarySchema.parse({ ...validItemSummary, quantity: "one" }));
  });
});

// ---------------------------------------------------------------------------
// PagedItemsSchema
// ---------------------------------------------------------------------------

describe("PagedItemsSchema", () => {
  it("parses a valid paged response", () => {
    const result = PagedItemsSchema.parse({
      items: [validItemSummary],
      totalCount: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });
    expect(result.items).toHaveLength(1);
    expect(result.totalCount).toBe(1);
  });

  it("parses an empty items array", () => {
    const result = PagedItemsSchema.parse({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    });
    expect(result.items).toHaveLength(0);
  });

  it("throws ZodError when totalCount is missing", () => {
    expectZodError(() =>
      PagedItemsSchema.parse({ items: [], page: 1, pageSize: 50, totalPages: 0 })
    );
  });
});

// ---------------------------------------------------------------------------
// ItemDetailSchema
// ---------------------------------------------------------------------------

describe("ItemDetailSchema", () => {
  const validDetail = {
    id: "33333333-3333-3333-3333-333333333333",
    collectionId: "11111111-1111-1111-1111-111111111111",
    name: "Kind of Blue",
    description: null,
    quantity: 1,
    locationId: null,
    locationName: null,
    itemTypeId: null,
    tags: [],
    createdUtc: "2026-04-20T00:10:00Z",
    updatedUtc: null,
    attributeValues: [],
    mediaAssets: [],
  };

  it("parses a valid item detail with updatedUtc null", () => {
    const result = ItemDetailSchema.parse(validDetail);
    expect(result.updatedUtc).toBeNull();
    expect(result.itemTypeId).toBeNull();
  });

  it("parses an item detail with a populated itemTypeId", () => {
    const result = ItemDetailSchema.parse({
      ...validDetail,
      itemTypeId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    });
    expect(result.itemTypeId).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
  });

  it("throws ZodError when attributeValues is missing", () => {
    const { attributeValues: _av, ...without } = validDetail;
    expectZodError(() => ItemDetailSchema.parse(without));
  });
});

// ---------------------------------------------------------------------------
// CollectionSchema
// ---------------------------------------------------------------------------

describe("CollectionSchema", () => {
  it("parses a valid collection", () => {
    const result = CollectionSchema.parse({
      id: "11111111-1111-1111-1111-111111111111",
      name: "Records",
      createdUtc: "2026-04-20T00:00:00Z",
    });
    expect(result.name).toBe("Records");
  });

  it("throws ZodError when id is missing", () => {
    expectZodError(() => CollectionSchema.parse({ name: "Records", createdUtc: "2026-04-20T00:00:00Z" }));
  });
});

// ---------------------------------------------------------------------------
// AttributeDataTypeSchema
// ---------------------------------------------------------------------------

describe("AttributeDataTypeSchema", () => {
  it.each(["Text", "Number", "Decimal", "Boolean", "Date", "SingleSelect"])(
    "accepts valid data type %s",
    (dataType) => {
      expect(() => AttributeDataTypeSchema.parse(dataType)).not.toThrow();
    }
  );

  it("throws ZodError for an unknown data type", () => {
    expectZodError(() => AttributeDataTypeSchema.parse("Blob"));
  });
});

// ---------------------------------------------------------------------------
// AttributeDefinitionSchema
// ---------------------------------------------------------------------------

describe("AttributeDefinitionSchema", () => {
  const validDef = {
    id: "22222222-2222-2222-2222-222222222222",
    collectionId: "11111111-1111-1111-1111-111111111111",
    name: "Release Year",
    key: "release-year",
    dataType: "Number",
    isRequired: false,
    isFilterable: true,
    sortOrder: 0,
    itemTypeId: null,
    createdUtc: "2026-04-20T00:05:00Z",
  };

  it("parses a valid attribute definition", () => {
    const result = AttributeDefinitionSchema.parse(validDef);
    expect(result.key).toBe("release-year");
    expect(result.itemTypeId).toBeNull();
  });

  it("throws ZodError for an invalid dataType", () => {
    expectZodError(() => AttributeDefinitionSchema.parse({ ...validDef, dataType: "Blob" }));
  });
});

// ---------------------------------------------------------------------------
// TagSchema / LocationSchema / ItemTypeSchema / SavedViewSchema / MediaAssetSchema
// ---------------------------------------------------------------------------

describe("TagSchema", () => {
  it("parses a valid tag", () => {
    const result = TagSchema.parse({ id: "aaa", name: "Jazz", key: "jazz", createdUtc: "2026-01-01T00:00:00Z" });
    expect(result.key).toBe("jazz");
  });

  it("throws ZodError when key is missing", () => {
    expectZodError(() => TagSchema.parse({ id: "aaa", name: "Jazz", createdUtc: "2026-01-01T00:00:00Z" }));
  });
});

describe("LocationSchema", () => {
  it("accepts description as null", () => {
    const result = LocationSchema.parse({ id: "aaa", name: "Shelf A", description: null, createdUtc: "2026-01-01T00:00:00Z" });
    expect(result.description).toBeNull();
  });

  it("accepts description as a string", () => {
    const result = LocationSchema.parse({ id: "aaa", name: "Shelf A", description: "Top shelf", createdUtc: "2026-01-01T00:00:00Z" });
    expect(result.description).toBe("Top shelf");
  });
});

describe("ItemTypeSchema", () => {
  it("parses a valid item type", () => {
    const result = ItemTypeSchema.parse({
      id: "aaa",
      collectionId: "bbb",
      name: "Vinyl",
      sortOrder: 0,
      createdUtc: "2026-01-01T00:00:00Z",
    });
    expect(result.name).toBe("Vinyl");
  });
});

describe("SavedViewSchema", () => {
  it("parses a valid saved view", () => {
    const result = SavedViewSchema.parse({
      id: "aaa",
      collectionId: "bbb",
      name: "Untagged items",
      filtersJson: '{"hasNoTags":true}',
      createdUtc: "2026-01-01T00:00:00Z",
    });
    expect(result.filtersJson).toBe('{"hasNoTags":true}');
  });
});

describe("MediaAssetSchema", () => {
  it("parses a valid media asset", () => {
    const result = MediaAssetSchema.parse({
      id: "aaa",
      url: "https://cdn.example.com/img.jpg",
      contentType: "image/jpeg",
      fileName: "img.jpg",
      sizeBytes: 12345,
      isPrimary: true,
      uploadedUtc: "2026-01-01T00:00:00Z",
    });
    expect(result.isPrimary).toBe(true);
  });

  it("throws ZodError when sizeBytes is not a number", () => {
    expectZodError(() =>
      MediaAssetSchema.parse({
        id: "aaa",
        url: "https://cdn.example.com/img.jpg",
        contentType: "image/jpeg",
        fileName: "img.jpg",
        sizeBytes: "large",
        isPrimary: false,
        uploadedUtc: "2026-01-01T00:00:00Z",
      })
    );
  });
});

describe("CollectionSummarySchema", () => {
  it("parses a valid summary", () => {
    const result = CollectionSummarySchema.parse({
      collectionId: "aaa",
      totalItems: 42,
      totalAttributeDefinitions: 3,
      tagsUsed: 5,
      locationsUsed: 2,
      itemsWithNoLocation: 10,
      itemsWithNoTags: 7,
      totalMediaAssets: 20,
    });
    expect(result.totalItems).toBe(42);
  });
});

describe("CollectionActivityEventSchema", () => {
  it("accepts notes as null", () => {
    const result = CollectionActivityEventSchema.parse({
      eventId: "aaa",
      itemId: "bbb",
      itemName: "Kind of Blue",
      eventType: "Created",
      occurredUtc: "2026-01-01T00:00:00Z",
      occurredBy: "user@example.com",
      notes: null,
    });
    expect(result.notes).toBeNull();
  });
});

describe("ItemEventSchema", () => {
  it("accepts notes as null", () => {
    const result = ItemEventSchema.parse({
      id: "aaa",
      itemId: "bbb",
      collectionId: "ccc",
      eventType: "Updated",
      occurredUtc: "2026-01-01T00:00:00Z",
      occurredBy: "user@example.com",
      notes: null,
    });
    expect(result.notes).toBeNull();
  });
});
