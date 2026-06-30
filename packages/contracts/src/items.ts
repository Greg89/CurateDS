import { z } from "zod";
import { AttributeDataTypeSchema } from "./attributes";
import { MediaAssetSchema } from "./media";
import { TagSchema } from "./tags";

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

export const ItemFiltersSchema = z.object({
  searchText: z.string().optional(),
  locationId: z.string().optional(),
  itemTypeId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  attributeFilters: z.record(z.string(), z.string()).optional(),
  sortBy: z.enum(["updatedUtc", "createdUtc", "name", "quantity"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  minQuantity: z.number().optional(),
  maxQuantity: z.number().optional(),
  createdAfter: z.string().optional(),
  createdBefore: z.string().optional(),
  hasNoLocation: z.boolean().optional(),
  hasNoTags: z.boolean().optional(),
});
export type ItemFilters = z.infer<typeof ItemFiltersSchema>;

export interface ItemAttributeValueInput {
  attributeDefinitionId: string;
  value: string;
}

export interface CreateItemInput {
  collectionId: string;
  name: string;
  description: string;
  quantity: number;
  locationId: string | null;
  itemTypeId?: string | null;
  tagIds: string[];
  attributeValues: ItemAttributeValueInput[];
}

export interface UpdateItemInput extends CreateItemInput {
  itemId: string;
}

const defaultItemSortBy: NonNullable<ItemFilters["sortBy"]> = "updatedUtc";
const defaultItemSortDirection: NonNullable<ItemFilters["sortDirection"]> = "desc";

export function normalizeTagIds(tagIds: readonly string[]) {
  return [...new Set(tagIds.map((tagId) => tagId.trim()).filter((tagId) => tagId.length > 0))]
    .sort((left, right) => left.localeCompare(right));
}

export function normalizeItemFilters(filters?: Readonly<ItemFilters>): ItemFilters {
  const normalizedAttributeFilters = Object.fromEntries(
    Object.entries(filters?.attributeFilters ?? {})
      .map(([attributeKey, value]) => [attributeKey.trim(), value.trim()] as const)
      .filter(([attributeKey, value]) => attributeKey.length > 0 && value.length > 0)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
  );

  const normalizedFilters: ItemFilters = {
    sortBy: filters?.sortBy ?? defaultItemSortBy,
    sortDirection: filters?.sortDirection ?? defaultItemSortDirection,
  };

  const normalizedSearchText = filters?.searchText?.trim();
  if (normalizedSearchText) normalizedFilters.searchText = normalizedSearchText;

  const normalizedLocationId = filters?.locationId?.trim();
  if (normalizedLocationId) normalizedFilters.locationId = normalizedLocationId;

  const normalizedItemTypeId = filters?.itemTypeId?.trim();
  if (normalizedItemTypeId) normalizedFilters.itemTypeId = normalizedItemTypeId;

  const normalizedTagIds = normalizeTagIds(filters?.tagIds ?? []);
  if (normalizedTagIds.length > 0) normalizedFilters.tagIds = normalizedTagIds;

  if (Object.keys(normalizedAttributeFilters).length > 0) {
    normalizedFilters.attributeFilters = normalizedAttributeFilters;
  }

  if (filters?.minQuantity != null && Number.isFinite(filters.minQuantity)) {
    normalizedFilters.minQuantity = filters.minQuantity;
  }

  if (filters?.maxQuantity != null && Number.isFinite(filters.maxQuantity)) {
    normalizedFilters.maxQuantity = filters.maxQuantity;
  }

  const normalizedCreatedAfter = filters?.createdAfter?.trim();
  if (normalizedCreatedAfter) normalizedFilters.createdAfter = normalizedCreatedAfter;

  const normalizedCreatedBefore = filters?.createdBefore?.trim();
  if (normalizedCreatedBefore) normalizedFilters.createdBefore = normalizedCreatedBefore;

  if (filters?.hasNoLocation) normalizedFilters.hasNoLocation = true;
  if (filters?.hasNoTags) normalizedFilters.hasNoTags = true;

  return normalizedFilters;
}

export function serializeItemFilters(filters?: Readonly<ItemFilters>) {
  return JSON.stringify(normalizeItemFilters(filters));
}

export function tryParseItemFilters(value: unknown): ItemFilters | null {
  const result = ItemFiltersSchema.safeParse(value);
  return result.success ? normalizeItemFilters(result.data) : null;
}

export function tryParseSerializedItemFilters(serializedFilters: string): ItemFilters | null {
  try {
    return tryParseItemFilters(JSON.parse(serializedFilters));
  } catch {
    return null;
  }
}

export function hasActiveItemFilters(filters?: Readonly<ItemFilters>) {
  const normalizedFilters = normalizeItemFilters(filters);

  return !!(
    normalizedFilters.searchText ||
    normalizedFilters.locationId ||
    normalizedFilters.itemTypeId ||
    normalizedFilters.tagIds?.length ||
    Object.keys(normalizedFilters.attributeFilters ?? {}).length > 0 ||
    normalizedFilters.sortBy !== defaultItemSortBy ||
    normalizedFilters.sortDirection !== defaultItemSortDirection ||
    normalizedFilters.minQuantity != null ||
    normalizedFilters.maxQuantity != null ||
    normalizedFilters.createdAfter ||
    normalizedFilters.createdBefore ||
    normalizedFilters.hasNoLocation ||
    normalizedFilters.hasNoTags
  );
}

export function countActiveItemFilters(filters?: Readonly<ItemFilters>) {
  const normalizedFilters = normalizeItemFilters(filters);

  return (
    (normalizedFilters.searchText ? 1 : 0) +
    (normalizedFilters.locationId ? 1 : 0) +
    ((normalizedFilters.tagIds?.length ?? 0) > 0 ? 1 : 0) +
    (normalizedFilters.itemTypeId ? 1 : 0) +
    Object.keys(normalizedFilters.attributeFilters ?? {}).length +
    (normalizedFilters.sortBy !== defaultItemSortBy ||
    normalizedFilters.sortDirection !== defaultItemSortDirection
      ? 1
      : 0) +
    (normalizedFilters.minQuantity != null ? 1 : 0) +
    (normalizedFilters.maxQuantity != null ? 1 : 0) +
    (normalizedFilters.createdAfter ? 1 : 0) +
    (normalizedFilters.createdBefore ? 1 : 0) +
    (normalizedFilters.hasNoLocation ? 1 : 0) +
    (normalizedFilters.hasNoTags ? 1 : 0)
  );
}

export function buildItemFiltersSearchParams(
  filters?: Readonly<ItemFilters>,
  options?: Readonly<{
    includeDefaultSort?: boolean;
    extraParams?: Readonly<Record<string, string | number | boolean | null | undefined>>;
  }>
) {
  const normalizedFilters = normalizeItemFilters(filters);
  const searchParams = new URLSearchParams();

  setTrimmedParam(searchParams, "searchText", normalizedFilters.searchText);
  setTrimmedParam(searchParams, "locationId", normalizedFilters.locationId);
  setTrimmedParam(searchParams, "itemTypeId", normalizedFilters.itemTypeId);
  appendTagIds(searchParams, normalizedFilters.tagIds);
  appendAttributeFilters(searchParams, normalizedFilters.attributeFilters);

  if (options?.includeDefaultSort || normalizedFilters.sortBy !== defaultItemSortBy) {
    searchParams.set("sortBy", normalizedFilters.sortBy ?? defaultItemSortBy);
  }

  if (
    options?.includeDefaultSort ||
    normalizedFilters.sortDirection !== defaultItemSortDirection
  ) {
    searchParams.set("sortDirection", normalizedFilters.sortDirection ?? defaultItemSortDirection);
  }

  if (normalizedFilters.minQuantity != null) {
    searchParams.set("minQuantity", String(normalizedFilters.minQuantity));
  }

  if (normalizedFilters.maxQuantity != null) {
    searchParams.set("maxQuantity", String(normalizedFilters.maxQuantity));
  }

  if (normalizedFilters.createdAfter) {
    searchParams.set("createdAfter", normalizedFilters.createdAfter);
  }

  if (normalizedFilters.createdBefore) {
    searchParams.set("createdBefore", normalizedFilters.createdBefore);
  }

  if (normalizedFilters.hasNoLocation) {
    searchParams.set("hasNoLocation", "true");
  }

  if (normalizedFilters.hasNoTags) {
    searchParams.set("hasNoTags", "true");
  }

  for (const [key, value] of Object.entries(options?.extraParams ?? {})) {
    if (value != null) {
      searchParams.set(key, String(value));
    }
  }

  return searchParams;
}

export function parseItemFiltersSearchParams(searchParams: URLSearchParams): ItemFilters {
  const attributeFilters = Object.fromEntries(
    searchParams
      .getAll("attributeFilters")
      .map((entry) => {
        const separatorIndex = entry.indexOf("=");
        if (separatorIndex <= 0) {
          return null;
        }

        return [
          entry.slice(0, separatorIndex),
          entry.slice(separatorIndex + 1),
        ] as const;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null)
  );

  const filters: ItemFilters = {
    searchText: searchParams.get("searchText") ?? undefined,
    locationId: searchParams.get("locationId") ?? undefined,
    itemTypeId: searchParams.get("itemTypeId") ?? undefined,
    tagIds: searchParams.getAll("tagIds"),
    attributeFilters,
    sortBy: parseSortBy(searchParams.get("sortBy")),
    sortDirection: parseSortDirection(searchParams.get("sortDirection")),
    minQuantity: parseNumber(searchParams.get("minQuantity")),
    maxQuantity: parseNumber(searchParams.get("maxQuantity")),
    createdAfter: searchParams.get("createdAfter") ?? undefined,
    createdBefore: searchParams.get("createdBefore") ?? undefined,
    hasNoLocation: parseBoolean(searchParams.get("hasNoLocation")),
    hasNoTags: parseBoolean(searchParams.get("hasNoTags")),
  };

  return normalizeItemFilters(filters);
}

function setTrimmedParam(searchParams: URLSearchParams, key: string, value?: string): void {
  const trimmed = value?.trim();
  if (trimmed) searchParams.set(key, trimmed);
}

function appendTagIds(searchParams: URLSearchParams, tagIds?: readonly string[]): void {
  for (const tagId of tagIds ?? []) {
    const normalizedTagId = tagId.trim();
    if (normalizedTagId.length > 0) searchParams.append("tagIds", normalizedTagId);
  }
}

function appendAttributeFilters(
  searchParams: URLSearchParams,
  attributeFilters?: Readonly<Record<string, string>>
): void {
  for (const [attributeKey, value] of Object.entries(attributeFilters ?? {})) {
    const normalizedKey = attributeKey.trim();
    const normalizedValue = value.trim();
    if (normalizedKey.length > 0 && normalizedValue.length > 0) {
      searchParams.append("attributeFilters", `${normalizedKey}=${normalizedValue}`);
    }
  }
}

function parseSortBy(value: string | null): ItemFilters["sortBy"] | undefined {
  return value === "updatedUtc" ||
    value === "createdUtc" ||
    value === "name" ||
    value === "quantity"
    ? value
    : undefined;
}

function parseSortDirection(value: string | null): ItemFilters["sortDirection"] | undefined {
  return value === "asc" || value === "desc" ? value : undefined;
}

function parseNumber(value: string | null) {
  if (value == null) {
    return undefined;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function parseBoolean(value: string | null) {
  return value === "1" || value?.toLowerCase() === "true" ? true : undefined;
}
