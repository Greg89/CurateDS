import { z } from 'zod';
export { TagSchema, type Tag } from '@curateds/contracts/tags';
import { TagSchema } from '@curateds/contracts/tags';

import { apiFetch } from './client';
import type { Tag } from '@curateds/contracts/tags';

export async function listTags(): Promise<Tag[]> {
  const raw = await apiFetch<unknown>('/tags');
  return z.array(TagSchema).parse(raw);
}
