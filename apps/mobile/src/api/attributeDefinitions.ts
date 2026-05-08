import { z } from 'zod';

import { apiFetch } from './client';

export const AttributeDataType = z.enum([
  'Text',
  'Number',
  'Decimal',
  'Boolean',
  'Date',
  'SingleSelect',
]);
export type AttributeDataType = z.infer<typeof AttributeDataType>;

export const AttributeDefinitionSchema = z.object({
  id: z.string().uuid(),
  collectionId: z.string().uuid(),
  name: z.string(),
  key: z.string(),
  dataType: AttributeDataType,
  isRequired: z.boolean(),
  isFilterable: z.boolean(),
  sortOrder: z.number().int(),
  itemTypeId: z.string().uuid().nullable(),
  createdUtc: z.string(),
});

export type AttributeDefinition = z.infer<typeof AttributeDefinitionSchema>;

export async function listAttributeDefinitions(
  collectionId: string,
): Promise<AttributeDefinition[]> {
  const raw = await apiFetch<unknown>(
    `/collections/${collectionId}/attribute-definitions`,
  );
  return z.array(AttributeDefinitionSchema).parse(raw);
}
