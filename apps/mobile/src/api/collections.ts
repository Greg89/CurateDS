import { z } from 'zod';

import { apiFetch } from './client';

export const CollectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdUtc: z.string(),
});

export type Collection = z.infer<typeof CollectionSchema>;

export async function listCollections(): Promise<Collection[]> {
  const raw = await apiFetch<unknown[]>('/collections');
  return z.array(CollectionSchema).parse(raw);
}
