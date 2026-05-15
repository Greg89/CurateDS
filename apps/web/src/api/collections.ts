import { z } from "zod";
import { apiBase, authHeader, readValidationMessage } from "./http";

// ---------------------------------------------------------------------------
// Schemas & types
// ---------------------------------------------------------------------------

export const CollectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdUtc: z.string(),
});
export type Collection = z.infer<typeof CollectionSchema>;

export const CollectionSummarySchema = z.object({
  collectionId: z.string(),
  totalItems: z.number(),
  totalAttributeDefinitions: z.number(),
  tagsUsed: z.number(),
  locationsUsed: z.number(),
  itemsWithNoLocation: z.number(),
  itemsWithNoTags: z.number(),
  totalMediaAssets: z.number(),
});
export type CollectionSummary = z.infer<typeof CollectionSummarySchema>;

export const ItemsByLocationSchema = z.object({
  locationId: z.string().nullable(),
  locationName: z.string(),
  count: z.number(),
});
export type ItemsByLocation = z.infer<typeof ItemsByLocationSchema>;

export const ItemsByTagSchema = z.object({
  tagId: z.string(),
  tagName: z.string(),
  count: z.number(),
});
export type ItemsByTag = z.infer<typeof ItemsByTagSchema>;

export const CollectionReportsSchema = z.object({
  itemsByLocation: z.array(ItemsByLocationSchema),
  itemsByTag: z.array(ItemsByTagSchema),
});
export type CollectionReports = z.infer<typeof CollectionReportsSchema>;

export const CollectionActivityEventSchema = z.object({
  eventId: z.string(),
  itemId: z.string(),
  itemName: z.string(),
  eventType: z.string(),
  occurredUtc: z.string(),
  occurredBy: z.string(),
  notes: z.string().nullable(),
});
export type CollectionActivityEvent = z.infer<typeof CollectionActivityEventSchema>;

export const PagedCollectionActivitySchema = z.object({
  events: z.array(CollectionActivityEventSchema),
  totalCount: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});
export type PagedCollectionActivity = z.infer<typeof PagedCollectionActivitySchema>;

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listCollections(): Promise<Collection[]> {
  const response = await fetch(`${apiBase}/collections`, {
    headers: await authHeader(),
  });

  if (!response.ok) {
    throw new Error("Failed to load collections.");
  }

  return z.array(CollectionSchema).parse(await response.json());
}

export async function createCollection(name: string): Promise<Collection> {
  const response = await fetch(`${apiBase}/collections`, {
    method: "POST",
    headers: { ...await authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(
      (await readValidationMessage(response)) ?? "Failed to create collection."
    );
  }

  return CollectionSchema.parse(await response.json());
}

export async function deleteCollection(collectionId: string): Promise<void> {
  const response = await fetch(`${apiBase}/collections/${collectionId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });

  if (!response.ok) {
    throw new Error("Failed to delete collection.");
  }
}

export async function getCollectionSummary(collectionId: string): Promise<CollectionSummary> {
  const response = await fetch(
    `${apiBase}/collections/${collectionId}/summary`,
    { headers: await authHeader() }
  );

  if (!response.ok) {
    throw new Error("Failed to load collection summary.");
  }

  return CollectionSummarySchema.parse(await response.json());
}

export async function getCollectionReports(collectionId: string): Promise<CollectionReports> {
  const response = await fetch(
    `${apiBase}/collections/${collectionId}/reports`,
    { headers: await authHeader() }
  );

  if (!response.ok) {
    throw new Error("Failed to load collection reports.");
  }

  return CollectionReportsSchema.parse(await response.json());
}

export async function listCollectionActivity(
  collectionId: string,
  page: number,
  pageSize: number
): Promise<PagedCollectionActivity> {
  const response = await fetch(
    `${apiBase}/collections/${collectionId}/activity?page=${page}&pageSize=${pageSize}`,
    { headers: await authHeader() }
  );

  if (!response.ok) {
    throw new Error("Failed to load collection activity.");
  }

  return PagedCollectionActivitySchema.parse(await response.json());
}

export async function downloadCollectionExport(
  collectionId: string,
  fileName: string
): Promise<void> {
  const response = await fetch(`${apiBase}/collections/${collectionId}/export`, {
    headers: await authHeader(),
  });

  if (!response.ok) throw new Error("Failed to export collection.");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
