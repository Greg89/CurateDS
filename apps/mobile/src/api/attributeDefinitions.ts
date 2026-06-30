import { z } from 'zod';
import {
  AttributeDataTypeSchema,
  AttributeDefinitionSchema,
  type AttributeDataType as AttributeDataTypeType,
} from '@curateds/contracts/attributes';
export { AttributeDefinitionSchema, type AttributeDefinition } from '@curateds/contracts/attributes';

import { apiFetch } from './client';
import type { AttributeDefinition } from '@curateds/contracts/attributes';

export const AttributeDataType = AttributeDataTypeSchema;
export type AttributeDataType = AttributeDataTypeType;

export async function listAttributeDefinitions(
  collectionId: string,
): Promise<AttributeDefinition[]> {
  const raw = await apiFetch<unknown>(
    `/collections/${collectionId}/attribute-definitions`,
  );
  return z.array(AttributeDefinitionSchema).parse(raw);
}
