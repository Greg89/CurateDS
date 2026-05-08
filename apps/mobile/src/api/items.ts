import { z } from 'zod';

import { apiFetch } from './client';

export const ItemSummarySchema = z.object({
  id: z.string().uuid(),
  collectionId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  quantity: z.number().int(),
  locationId: z.string().uuid().nullable(),
  locationName: z.string().nullable(),
  tags: z.array(z.string()),
  attributeValueCount: z.number().int(),
  createdUtc: z.string(),
  updatedUtc: z.string().nullable(),
  primaryImageUrl: z.string().nullable(),
});

export type ItemSummary = z.infer<typeof ItemSummarySchema>;

const PagedItemsResponseSchema = z.object({
  items: z.array(ItemSummarySchema),
  totalCount: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export async function listItems(collectionId: string): Promise<ItemSummary[]> {
  const raw = await apiFetch<unknown>(`/collections/${collectionId}/items`);
  const parsed = PagedItemsResponseSchema.parse(raw);
  return parsed.items;
}

export const MediaAssetSchema = z.object({
  id: z.string().uuid(),
  url: z.string(),
  contentType: z.string(),
  fileName: z.string(),
  sizeBytes: z.number(),
  isPrimary: z.boolean(),
  uploadedUtc: z.string(),
});

export const AttributeValueSchema = z.object({
  attributeDefinitionId: z.string().uuid(),
  attributeName: z.string(),
  attributeKey: z.string(),
  dataType: z.string(),
  value: z.string(),
});

export const TagDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export const ItemDetailSchema = z.object({
  id: z.string().uuid(),
  collectionId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  quantity: z.number().int(),
  locationId: z.string().uuid().nullable(),
  locationName: z.string().nullable(),
  itemTypeId: z.string().uuid().nullable(),
  tags: z.array(TagDetailSchema),
  createdUtc: z.string(),
  updatedUtc: z.string().nullable(),
  attributeValues: z.array(AttributeValueSchema),
  mediaAssets: z.array(MediaAssetSchema),
});

export type MediaAsset = z.infer<typeof MediaAssetSchema>;
export type AttributeValue = z.infer<typeof AttributeValueSchema>;
export type ItemDetail = z.infer<typeof ItemDetailSchema>;

export async function getItemDetail(
  collectionId: string,
  itemId: string,
): Promise<ItemDetail> {
  const raw = await apiFetch<unknown>(`/collections/${collectionId}/items/${itemId}`);
  return ItemDetailSchema.parse(raw);
}

export interface CreateItemInput {
  name: string;
  description: string;
  quantity: number;
  locationId: string | null;
  tagIds: string[];
  attributeValues: Array<{ attributeDefinitionId: string; value: string }>;
}

export async function createItem(
  collectionId: string,
  input: CreateItemInput,
): Promise<ItemDetail> {
  const raw = await apiFetch<unknown>(`/collections/${collectionId}/items`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return ItemDetailSchema.parse(raw);
}

export async function uploadItemMedia(
  collectionId: string,
  itemId: string,
  uri: string,
  fileName: string,
  contentType: string,
): Promise<MediaAsset> {
  const body = new FormData();
  body.append('file', { uri, name: fileName, type: contentType } as unknown as Blob);

  const raw = await apiFetch<unknown>(
    `/collections/${collectionId}/items/${itemId}/media`,
    { method: 'POST', body, headers: { Accept: 'application/json' } },
  );
  return MediaAssetSchema.parse(raw);
}
