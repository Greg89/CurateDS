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
