import { z } from "zod";

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
