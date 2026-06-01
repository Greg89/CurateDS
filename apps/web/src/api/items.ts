import { z } from "zod";
import { apiBase, authHeader, readValidationMessage } from "./http";
import { TagSchema } from "./tags";
import { MediaAssetSchema } from "./media";
import { AttributeDataTypeSchema } from "./attributes";

export const ItemAttributeValueSchema = z.object({
  attributeDefinitionId: z.string(),
  attributeName: z.string(),
  attributeKey: z.string(),
  dataType: AttributeDataTypeSchema,
  value: z.string(),
});
export type ItemAttributeValue = z.infer<typeof ItemAttributeValueSchema>;

export const ItemSummarySchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  quantity: z.number(),
  locationId: z.string().nullable(),
  locationName: z.string().nullable(),
  tags: z.array(z.string()),
  attributeValueCount: z.number(),
  createdUtc: z.string(),
  updatedUtc: z.string().nullable(),
  primaryImageUrl: z.string().nullable(),
});
export type ItemSummary = z.infer<typeof ItemSummarySchema>;

export const PagedItemsSchema = z.object({
  items: z.array(ItemSummarySchema),
  totalCount: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});
export type PagedItems = z.infer<typeof PagedItemsSchema>;

export const ItemDetailSchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  quantity: z.number(),
  locationId: z.string().nullable(),
  locationName: z.string().nullable(),
  itemTypeId: z.string().nullable(),
  tags: z.array(TagSchema),
  createdUtc: z.string(),
  updatedUtc: z.string().nullable(),
  attributeValues: z.array(ItemAttributeValueSchema),
  mediaAssets: z.array(MediaAssetSchema),
});
export type ItemDetail = z.infer<typeof ItemDetailSchema>;

export const ItemEventSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  collectionId: z.string(),
  eventType: z.string(),
  occurredUtc: z.string(),
  occurredBy: z.string(),
  notes: z.string().nullable(),
});
export type ItemEvent = z.infer<typeof ItemEventSchema>;

export interface ItemFilters {
  searchText?: string;
  locationId?: string;
  itemTypeId?: string;
  tagIds?: string[];
  attributeFilters?: Record<string, string>;
  sortBy?: "updatedUtc" | "createdUtc" | "name" | "quantity";
  sortDirection?: "asc" | "desc";
  minQuantity?: number;
  maxQuantity?: number;
  createdAfter?: string;
  createdBefore?: string;
  hasNoLocation?: boolean;
  hasNoTags?: boolean;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listItems(
  collectionId: string,
  filters?: Readonly<ItemFilters>,
  page = 1,
  pageSize = 50
): Promise<PagedItems> {
  const searchParams = new URLSearchParams();

  const searchText = filters?.searchText?.trim();
  if (searchText) searchParams.set("searchText", searchText);

  const locationId = filters?.locationId?.trim();
  if (locationId) searchParams.set("locationId", locationId);

  for (const tagId of filters?.tagIds ?? []) {
    if (tagId.trim().length > 0) searchParams.append("tagIds", tagId);
  }

  for (const [attributeKey, value] of Object.entries(filters?.attributeFilters ?? {})) {
    const normalizedKey = attributeKey.trim();
    const normalizedValue = value.trim();
    if (normalizedKey.length > 0 && normalizedValue.length > 0) {
      searchParams.append("attributeFilters", `${normalizedKey}=${normalizedValue}`);
    }
  }

  if (filters?.sortBy) searchParams.set("sortBy", filters.sortBy);
  if (filters?.sortDirection) searchParams.set("sortDirection", filters.sortDirection);
  if (filters?.minQuantity != null) searchParams.set("minQuantity", String(filters.minQuantity));
  if (filters?.maxQuantity != null) searchParams.set("maxQuantity", String(filters.maxQuantity));
  if (filters?.createdAfter) searchParams.set("createdAfter", filters.createdAfter);
  if (filters?.createdBefore) searchParams.set("createdBefore", filters.createdBefore);
  if (filters?.hasNoLocation) searchParams.set("hasNoLocation", "true");
  if (filters?.hasNoTags) searchParams.set("hasNoTags", "true");

  const itemTypeId = filters?.itemTypeId?.trim();
  if (itemTypeId) searchParams.set("itemTypeId", itemTypeId);

  searchParams.set("page", String(page));
  searchParams.set("pageSize", String(pageSize));

  const qs = searchParams.toString();
  const response = await fetch(
    `${apiBase}/collections/${collectionId}/items${qs ? `?${qs}` : ""}`,
    { headers: await authHeader() }
  );

  if (!response.ok) throw new Error("Failed to load items.");

  return PagedItemsSchema.parse(await response.json());
}

export async function getItemDetail(
  collectionId: string,
  itemId: string
): Promise<ItemDetail> {
  const response = await fetch(
    `${apiBase}/collections/${collectionId}/items/${itemId}`,
    { headers: await authHeader() }
  );

  if (!response.ok) throw new Error("Failed to load item details.");

  return ItemDetailSchema.parse(await response.json());
}

export async function listItemEvents(
  collectionId: string,
  itemId: string
): Promise<ItemEvent[]> {
  const response = await fetch(
    `${apiBase}/collections/${collectionId}/items/${itemId}/events`,
    { headers: await authHeader() }
  );

  if (!response.ok) throw new Error("Failed to load item history.");

  return z.array(ItemEventSchema).parse(await response.json());
}

export async function createItem(input: {
  collectionId: string;
  name: string;
  description: string;
  quantity: number;
  locationId: string | null;
  itemTypeId?: string | null;
  tagIds: string[];
  attributeValues: Array<{ attributeDefinitionId: string; value: string }>;
}): Promise<ItemDetail> {
  const response = await fetch(
    `${apiBase}/collections/${input.collectionId}/items`,
    {
      method: "POST",
      headers: { ...await authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        description: input.description,
        quantity: input.quantity,
        locationId: input.locationId,
        itemTypeId: input.itemTypeId ?? null,
        tagIds: input.tagIds,
        attributeValues: input.attributeValues,
      }),
    }
  );

  if (!response.ok) {
    throw new Error((await readValidationMessage(response)) ?? "Failed to create item.");
  }

  return ItemDetailSchema.parse(await response.json());
}

export async function updateItem(input: {
  collectionId: string;
  itemId: string;
  name: string;
  description: string;
  quantity: number;
  locationId: string | null;
  itemTypeId?: string | null;
  tagIds: string[];
  attributeValues: Array<{ attributeDefinitionId: string; value: string }>;
}): Promise<ItemDetail> {
  const response = await fetch(
    `${apiBase}/collections/${input.collectionId}/items/${input.itemId}`,
    {
      method: "PUT",
      headers: { ...await authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        description: input.description,
        quantity: input.quantity,
        locationId: input.locationId,
        itemTypeId: input.itemTypeId ?? null,
        tagIds: input.tagIds,
        attributeValues: input.attributeValues,
      }),
    }
  );

  if (!response.ok) {
    throw new Error((await readValidationMessage(response)) ?? "Failed to update item.");
  }

  return ItemDetailSchema.parse(await response.json());
}

export async function deleteItem(input: {
  collectionId: string;
  itemId: string;
}): Promise<void> {
  const response = await fetch(
    `${apiBase}/collections/${input.collectionId}/items/${input.itemId}`,
    { method: "DELETE", headers: await authHeader() }
  );

  if (!response.ok) throw new Error("Failed to delete item.");
}
