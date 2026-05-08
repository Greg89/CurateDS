import { z } from 'zod';

import { apiFetch } from './client';

export const LocationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdUtc: z.string(),
});

export type Location = z.infer<typeof LocationSchema>;

export async function listLocations(): Promise<Location[]> {
  const raw = await apiFetch<unknown>('/locations');
  return z.array(LocationSchema).parse(raw);
}
