import { z } from "zod";
export {
  ItemAttributeValueSchema,
  ItemDetailSchema,
  ItemEventSchema,
  ItemFiltersSchema,
  ItemSummarySchema,
  PagedItemsSchema,
  buildItemFiltersSearchParams,
  countActiveItemFilters,
  hasActiveItemFilters,
  normalizeItemFilters,
  normalizeTagIds,
  parseItemFiltersSearchParams,
  serializeItemFilters,
  tryParseItemFilters,
  tryParseSerializedItemFilters,
  type CreateItemInput,
  type ItemAttributeValue,
  type ItemAttributeValueInput,
  type ItemDetail,
  type ItemEvent,
  type ItemFilters,
  type ItemSummary,
  type PagedItems,
  type UpdateItemInput,
} from "@curateds/contracts/items";
import {
  ItemDetailSchema,
  ItemEventSchema,
  PagedItemsSchema,
  buildItemFiltersSearchParams,
} from "@curateds/contracts/items";
import { apiBase, authHeader, readValidationMessage } from "./http";
import type { ItemDetail, ItemEvent, ItemFilters, PagedItems } from "@curateds/contracts/items";

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listItems(
  collectionId: string,
  filters?: Readonly<ItemFilters>,
  page = 1,
  pageSize = 50
): Promise<PagedItems> {
  const searchParams = buildListItemsSearchParams(filters, page, pageSize);

  const qs = searchParams.toString();
  const querySuffix = qs ? `?${qs}` : "";
  const response = await fetch(
    `${apiBase}/collections/${collectionId}/items${querySuffix}`,
    { headers: await authHeader() }
  );

  if (!response.ok) throw new Error("Failed to load items.");

  return PagedItemsSchema.parse(await response.json());
}

function buildListItemsSearchParams(
  filters: Readonly<ItemFilters> | undefined,
  page: number,
  pageSize: number
): URLSearchParams {
  const searchParams = buildItemFiltersSearchParams(filters, { includeDefaultSort: true });
  searchParams.set("page", String(page));
  searchParams.set("pageSize", String(pageSize));

  return searchParams;
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
