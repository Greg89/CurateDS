import { z } from 'zod';
export { LocationSchema, type Location } from '@curateds/contracts/locations';
import { LocationSchema } from '@curateds/contracts/locations';

import { apiFetch } from './client';
import type { Location } from '@curateds/contracts/locations';

export async function listLocations(): Promise<Location[]> {
  const raw = await apiFetch<unknown>('/locations');
  return z.array(LocationSchema).parse(raw);
}
