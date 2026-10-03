import { z } from "zod";
import type { components } from "./generated/api";

export type Collection = components["schemas"]["CollectionResponse"];
export const collectionSchema: z.ZodType<Collection> = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  createdUtc: z.iso.datetime({ offset: true }),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});
export const collectionsSchema = z.array(collectionSchema);
export const collectionQueryKey = ["collections"] as const;

const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional();
export function isCoverUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
export const createCollectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters for the name.")
    .max(100),
  category: optionalText(100),
  description: optionalText(1000),
  coverImageUrl: optionalText(2048).refine(
    (value) => !value || isCoverUrl(value),
    "Use an HTTPS image URL without a username or password.",
  ),
  color: z.enum(["forest", "clay", "slate"]).optional(),
});
export const summarySchema: z.ZodType<
  components["schemas"]["CollectionSummaryResponse"]
> = z.object({
  collectionId: z.uuid(),
  totalItems: z.number().int().nonnegative(),
  totalAttributeDefinitions: z.number().int().nonnegative(),
  tagsUsed: z.number().int().nonnegative(),
  locationsUsed: z.number().int().nonnegative(),
  itemsWithNoLocation: z.number().int().nonnegative(),
  itemsWithNoTags: z.number().int().nonnegative(),
  totalMediaAssets: z.number().int().nonnegative(),
});
export type RecentItem = Pick<
  components["schemas"]["ItemSummaryResponse"],
  | "id"
  | "collectionId"
  | "name"
  | "description"
  | "createdUtc"
  | "primaryImageUrl"
>;
export const recentItemSchema: z.ZodType<RecentItem> = z.object({
  id: z.uuid(),
  collectionId: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdUtc: z.iso.datetime({ offset: true }),
  primaryImageUrl: z.string().nullable(),
});
export const presentationInputSchema = z.object({
  showCover: z.boolean(),
  showSummary: z.boolean(),
  showPinnedItems: z.boolean(),
  showRecentItems: z.boolean(),
  pinnedItemIds: z
    .array(z.uuid())
    .max(6)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Choose different items.",
    ),
});
export const presentationSchema = z.object({
  collectionId: z.uuid(),
  showCover: z.boolean(),
  showSummary: z.boolean(),
  showPinnedItems: z.boolean(),
  showRecentItems: z.boolean(),
  pinnedItems: z.array(recentItemSchema).max(6),
}) satisfies z.ZodType<components["schemas"]["CollectionPresentationDto"]>;
export type Presentation = z.infer<typeof presentationSchema>;
export const presentationKey = (id: string) =>
  ["collection-presentation", id] as const;
export function validatePresentation(value: unknown, id: string) {
  const parsed = presentationSchema.parse(value);
  if (
    parsed.collectionId !== id ||
    parsed.pinnedItems.some((item) => item.collectionId !== id)
  )
    throw new CollectionsError(502);
  return parsed;
}
export async function fetchPresentation(id: string, signal?: AbortSignal) {
  const response = await fetch(`/api/collections/${id}/presentation`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new CollectionsError(response.status);
  return validatePresentation(await response.json(), id);
}
export const recentItemsSchema = z.object({
  items: z.array(recentItemSchema),
  totalCount: z.number().int().nonnegative(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});
export const createItemSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Use at least 3 characters for the name.")
      .max(120),
    description: optionalText(2000),
    quantity: z.number().int().min(1).max(2147483647),
  })
  .transform((value) => ({
    ...value,
    description: value.description || null,
    locationId: null,
    itemTypeId: null,
    tagIds: [],
    attributeValues: [],
  }));
export const itemReceiptSchema = z.object({
  id: z.uuid(),
  collectionId: z.uuid(),
  name: z.string(),
});
export const overviewKey = (id: string) => ["collection-overview", id] as const;

export async function fetchOverview(id: string, signal?: AbortSignal) {
  const [summary, recent, presentation] = await Promise.all([
    fetch(`/api/collections/${id}/summary`, { signal, cache: "no-store" }),
    fetch(`/api/collections/${id}/items`, { signal, cache: "no-store" }),
    fetchPresentation(id, signal),
  ]);
  if (!summary.ok || !recent.ok)
    throw new CollectionsError(!summary.ok ? summary.status : recent.status);
  const counts = summarySchema.parse(await summary.json());
  const items = recentItemsSchema.parse(await recent.json());
  if (
    counts.collectionId !== id ||
    items.items.some((item) => item.collectionId !== id)
  )
    throw new CollectionsError(502);
  return { summary: counts, items: items.items, presentation };
}

export async function saveCollectionData(path: string, data: unknown) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new CollectionsError(response.status);
  return response.json();
}

export class CollectionsError extends Error {
  constructor(public readonly status: number) {
    super(
      status === 401
        ? "Your session has ended. Sign in again."
        : status === 403
          ? "You do not have access to these collections."
          : "We couldn't load your collections. Please try again.",
    );
  }
}

export async function fetchCollections({
  signal,
}: { signal?: AbortSignal } = {}): Promise<Collection[]> {
  const response = await fetch("/api/collections", {
    signal,
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) throw new CollectionsError(response.status);
  const parsed = collectionsSchema.safeParse(await response.json());
  if (!parsed.success) throw new CollectionsError(502);
  return parsed.data;
}
