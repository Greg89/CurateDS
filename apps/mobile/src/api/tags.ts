import { z } from 'zod';

import { apiFetch } from './client';

export const TagSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  key: z.string(),
  createdUtc: z.string(),
});

export type Tag = z.infer<typeof TagSchema>;

export async function listTags(): Promise<Tag[]> {
  const raw = await apiFetch<unknown>('/tags');
  return z.array(TagSchema).parse(raw);
}
