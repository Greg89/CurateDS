import { z } from 'zod';
export { CollectionSchema, type Collection } from '@curateds/contracts/collections';
import { CollectionSchema } from '@curateds/contracts/collections';

import { apiFetch } from './client';
import type { Collection } from '@curateds/contracts/collections';

export async function listCollections(): Promise<Collection[]> {
  const raw = await apiFetch<unknown[]>('/collections');
  return z.array(CollectionSchema).parse(raw);
}
