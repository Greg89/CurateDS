import { z } from "zod";
import { browseParams, readJson } from "./items";
import { CollectionsError, summarySchema } from "./collections";
import type { components } from "./generated/api";

const count = z.number().int().nonnegative();
const date = z.iso.datetime({ offset: true });
export const insightsKey = (id: string) => ["insights", id] as const;
export const activityKey = (id: string) => ["activity", id] as const;
export const viewsKey = (id: string) => ["saved-views", id] as const;
export const insightsSchema = z.object({
  collectionId: z.uuid(),
  summary: summarySchema,
  reports: z.object({
    itemsByLocation: z.array(
      z.object({
        locationId: z.uuid().nullable(),
        locationName: z.string(),
        count,
      }),
    ),
    itemsByTag: z.array(
      z.object({ tagId: z.uuid(), tagName: z.string(), count }),
    ),
  }),
  itemsByType: z.array(
    z.object({ itemTypeId: z.uuid().nullable(), name: z.string(), count }),
  ),
  addedByMonth: z
    .array(z.object({ fromUtc: date, toUtc: date, count }))
    .length(12),
  attribute: z
    .object({
      definitionId: z.uuid(),
      key: z.string(),
      name: z.string(),
      totalWithValue: count,
      values: z.array(z.object({ value: z.string(), count })),
    })
    .nullable(),
}) satisfies z.ZodType<components["schemas"]["CollectionInsightsDto"]>;
export const activitySchema = z.object({
  events: z.array(
    z.object({
      eventId: z.uuid(),
      itemId: z.uuid(),
      itemName: z.string(),
      eventType: z.string(),
      occurredUtc: date,
      occurredBy: z.string(),
      notes: z.string().nullable(),
    }),
  ),
  totalCount: count,
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: count,
}) satisfies z.ZodType<
  components["schemas"]["PagedCollectionActivityResponse"]
>;
export const savedViewSchema = z.object({
  id: z.uuid(),
  collectionId: z.uuid(),
  name: z.string(),
  filtersJson: z.string(),
  createdUtc: date,
}) satisfies z.ZodType<components["schemas"]["SavedViewResponse"]>;

const strings = [
  "searchText",
  "locationId",
  "itemTypeId",
  "sortBy",
  "sortDirection",
  "createdAfter",
  "createdBefore",
  "createdBeforeExclusive",
  "exactAttributeKey",
  "exactAttributeValue",
  "tagMatchMode",
];
const booleans = ["hasNoLocation", "hasNoTags", "hasNoItemType"];
const numbers = ["minQuantity", "maxQuantity"];
// Fail closed for saved filters this client cannot represent; never silently broaden a saved view.
export function restoreView(json: string) {
  const object: unknown = JSON.parse(json);
  if (!object || typeof object !== "object" || Array.isArray(object))
    throw new Error("Invalid view");
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(object)) {
    if (strings.includes(key) && typeof value === "string") {
      params.set(
        key,
        key.startsWith("created") && /^\d{4}-\d{2}-\d{2}$/.test(value)
          ? value + "T00:00:00Z"
          : value,
      );
    } else if (booleans.includes(key) && typeof value === "boolean")
      params.set(key, String(value));
    else if (numbers.includes(key) && typeof value === "number")
      params.set(key, String(value));
    else if (
      key === "tagIds" &&
      Array.isArray(value) &&
      value.every((v) => typeof v === "string")
    )
      value.forEach((v) => params.append(key, v));
    else if (
      key === "attributeFilters" &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      for (const [name, text] of Object.entries(value)) {
        if (typeof text !== "string" || !name || name.includes("="))
          throw new Error("Invalid attribute");
        params.append(key, name + "=" + text);
      }
    } else throw new Error("Unsupported view filter");
  }
  return browseParams(params);
}
export function serializeView(params: URLSearchParams) {
  const checked = browseParams(params);
  const object: Record<string, unknown> = {};
  for (const key of strings)
    if (checked.has(key)) object[key] = checked.get(key);
  for (const key of booleans)
    if (checked.has(key)) object[key] = checked.get(key) === "true";
  for (const key of numbers)
    if (checked.has(key)) object[key] = Number(checked.get(key));
  if (checked.has("tagIds")) object.tagIds = checked.getAll("tagIds");
  if (checked.has("attributeFilters"))
    object.attributeFilters = Object.fromEntries(
      checked
        .getAll("attributeFilters")
        .map((value) => [
          value.slice(0, value.indexOf("=")),
          value.slice(value.indexOf("=") + 1),
        ]),
    );
  return JSON.stringify(object);
}
export const saveViewInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  filtersJson: z
    .string()
    .max(20000)
    .refine((value) => {
      try {
        restoreView(value);
        return true;
      } catch {
        return false;
      }
    }, "Unsupported saved filters"),
});
export async function fetchInsights(
  id: string,
  attribute: string,
  signal?: AbortSignal,
) {
  const data = await readJson(
    `/api/collections/${id}/insights${attribute ? "?attributeDefinitionId=" + encodeURIComponent(attribute) : ""}`,
    insightsSchema,
    signal,
  );
  if (
    data.collectionId !== id ||
    data.summary.collectionId !== id ||
    (attribute && data.attribute?.definitionId !== attribute)
  )
    throw new CollectionsError(502);
  return data;
}
export async function fetchViews(id: string, signal?: AbortSignal) {
  const data = await readJson(
    `/api/collections/${id}/saved-views`,
    z.array(savedViewSchema),
    signal,
  );
  if (data.some((view) => view.collectionId !== id))
    throw new CollectionsError(502);
  return data;
}
