import { z } from "zod";
import type { components } from "./generated/api";
import { CollectionsError } from "./collections";

const date = z.iso.datetime({ offset: true });
export const tagSchema = z.object({ id: z.uuid(), name: z.string(), key: z.string(), createdUtc: date }) satisfies z.ZodType<components["schemas"]["TagResponse"]>;
export const locationSchema = z.object({ id: z.uuid(), name: z.string(), description: z.string().nullable(), createdUtc: date }) satisfies z.ZodType<components["schemas"]["LocationResponse"]>;
export const itemTypeSchema = z.object({ id: z.uuid(), collectionId: z.uuid(), name: z.string(), sortOrder: z.number().int(), createdUtc: date }) satisfies z.ZodType<components["schemas"]["ItemTypeResponse"]>;
const dataTypeSchema = z.enum(["Text", "Number", "Decimal", "Boolean", "Date", "SingleSelect"]);
export const definitionSchema = z.object({ id: z.uuid(), collectionId: z.uuid(), name: z.string(), key: z.string(), dataType: dataTypeSchema,
  isRequired: z.boolean(), isFilterable: z.boolean(), sortOrder: z.number().int(), itemTypeId: z.uuid().nullable(), createdUtc: date }) satisfies z.ZodType<components["schemas"]["AttributeDefinitionResponse"]>;
export const mediaSchema = z.object({ id: z.uuid(), url: z.string(), contentType: z.string(), fileName: z.string(), sizeBytes: z.number().nonnegative(), isPrimary: z.boolean(), uploadedUtc: date }) satisfies z.ZodType<components["schemas"]["MediaAssetDto"]>;
export const itemDetailSchema = z.object({ id: z.uuid(), collectionId: z.uuid(), name: z.string(), description: z.string().nullable(), quantity: z.number().int(),
  locationId: z.uuid().nullable(), locationName: z.string().nullable(), itemTypeId: z.uuid().nullable(), tags: z.array(tagSchema), createdUtc: date, updatedUtc: date.nullable(),
  attributeValues: z.array(z.object({ attributeDefinitionId: z.uuid(), attributeName: z.string(), attributeKey: z.string(), dataType: dataTypeSchema, value: z.string() })),
  mediaAssets: z.array(mediaSchema),
}) satisfies z.ZodType<components["schemas"]["ItemDetailResponse"]>;
export const itemSummarySchema = z.object({ id: z.uuid(), collectionId: z.uuid(), name: z.string(), description: z.string().nullable(), quantity: z.number().int(),
  locationId: z.uuid().nullable(), locationName: z.string().nullable(), tags: z.array(z.string()), attributeValueCount: z.number().int(),
  createdUtc: date, updatedUtc: date.nullable(), primaryImageUrl: z.string().nullable(),
}) satisfies z.ZodType<components["schemas"]["ItemSummaryResponse"]>;
export const itemListSchema = z.object({ items: z.array(itemSummarySchema), totalCount: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive(), totalPages: z.number().int().nonnegative() }) satisfies z.ZodType<components["schemas"]["PagedItemsResponse"]>;
export const itemInputSchema = z.object({
  name: z.string().trim().min(3, "Use at least 3 characters for the name.").max(120), description: z.string().max(2000).nullable().default(null),
  quantity: z.number().int().min(1).max(2147483647), locationId: z.uuid().nullable().default(null), itemTypeId: z.uuid().nullable().default(null),
  tagIds: z.array(z.uuid()).max(100).default([]), attributeValues: z.array(z.object({ attributeDefinitionId: z.uuid(), value: z.string().trim().min(1).max(10000) })).max(100).default([]),
}) satisfies z.ZodType<components["schemas"]["CreateItemRequest"]>;
export type ItemDetail = z.infer<typeof itemDetailSchema>;
export type Definition = z.infer<typeof definitionSchema>;
export type ItemOptions = { tags: z.infer<typeof tagSchema>[]; locations: z.infer<typeof locationSchema>[]; types: z.infer<typeof itemTypeSchema>[]; definitions: Definition[] };
export const itemKey = (collectionId: string, itemId: string) => ["item", collectionId, itemId] as const;
export const itemsKey = (collectionId: string) => ["items", collectionId] as const;
export const optionsKey = (collectionId: string) => ["item-options", collectionId] as const;

export function browseParams(search: URLSearchParams) {
  const result = new URLSearchParams();
  const schema = z.object({ searchText: z.string().trim().max(200).optional(), locationId: z.uuid().optional(), itemTypeId: z.uuid().optional(),
    sortBy: z.enum(["createdUtc", "name", "quantity", "updatedUtc"]).default("createdUtc"), sortDirection: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(48).default(12),
    hasNoLocation: z.enum(["true", "false"]).optional(), hasNoTags: z.enum(["true", "false"]).optional(), tagMatchMode: z.enum(["all", "any"]).default("all"),
  });
  const parsed = schema.parse(Object.fromEntries([...search.entries()].filter(([,value]) => value !== "")));
  for (const [key, value] of Object.entries(parsed)) result.set(key, String(value));
  const tags = z.array(z.uuid()).max(50).parse(search.getAll("tagIds").filter(Boolean));
  for (const tag of new Set(tags)) result.append("tagIds", tag);
  return result;
}
export async function readJson<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new CollectionsError(response.status);
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw new CollectionsError(502);
  return parsed.data;
}
export async function fetchItem(collectionId: string, itemId: string, signal?: AbortSignal) {
  const item = await readJson(`/api/collections/${collectionId}/items/${itemId}`, itemDetailSchema, signal);
  if (item.collectionId !== collectionId || item.id !== itemId) throw new CollectionsError(502);
  return item;
}
export async function fetchOptions(id: string, signal?: AbortSignal): Promise<ItemOptions> {
  const base = `/api/collections/${id}/options/`;
  const [definitions, types, tags, locations] = await Promise.all([
    readJson(base + "attribute-definitions", z.array(definitionSchema), signal), readJson(base + "item-types", z.array(itemTypeSchema), signal),
    readJson(base + "tags", z.array(tagSchema), signal), readJson(base + "locations", z.array(locationSchema), signal),
  ]);
  if ([...definitions, ...types].some(value => value.collectionId !== id)) throw new CollectionsError(502);
  return { definitions, types, tags, locations };
}
export async function writeItem(path: string, method: "POST" | "PUT" | "DELETE", body?: unknown) {
  const response = await fetch(path, { method, credentials: "same-origin", ...(body instanceof FormData
    ? { body } : body !== undefined ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } } : {}) });
  if (!response.ok) throw new CollectionsError(response.status);
  return response.status === 204 ? null : response.json();
}
