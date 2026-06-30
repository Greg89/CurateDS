export {
  ItemAttributeValueSchema as AttributeValueSchema,
  ItemDetailSchema,
  ItemSummarySchema,
  MediaAssetSchema,
  PagedItemsSchema,
  TagSchema as TagDetailSchema,
  type ItemAttributeValue as AttributeValue,
  type ItemDetail,
  type ItemSummary,
  type MediaAsset,
} from '@curateds/contracts/items';
import {
  CreateItemRequestSchema,
  ItemDetailSchema,
  MediaAssetSchema,
  PagedItemsSchema as PagedItemsResponseSchema,
} from '@curateds/contracts/items';

import { apiFetch } from './client';
import type { ItemDetail, ItemSummary, MediaAsset } from '@curateds/contracts/items';

export async function listItems(collectionId: string): Promise<ItemSummary[]> {
  const raw = await apiFetch<unknown>(`/collections/${collectionId}/items`);
  const parsed = PagedItemsResponseSchema.parse(raw);
  return parsed.items;
}

export async function getItemDetail(
  collectionId: string,
  itemId: string,
): Promise<ItemDetail> {
  const raw = await apiFetch<unknown>(`/collections/${collectionId}/items/${itemId}`);
  return ItemDetailSchema.parse(raw);
}

export interface CreateItemInput {
  name: string;
  description: string | null;
  quantity: number;
  locationId: string | null;
  itemTypeId?: string | null;
  tagIds: string[];
  attributeValues: Array<{ attributeDefinitionId: string; value: string }>;
}

export async function createItem(
  collectionId: string,
  input: CreateItemInput,
): Promise<ItemDetail> {
  const raw = await apiFetch<unknown>(`/collections/${collectionId}/items`, {
    method: 'POST',
    body: JSON.stringify(
      CreateItemRequestSchema.parse({
        ...input,
        description: input.description ?? null,
        itemTypeId: input.itemTypeId ?? null,
      }),
    ),
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
