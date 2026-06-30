import { z } from "zod";

export const AttributeDataTypeSchema = z.enum([
  "Text",
  "Number",
  "Decimal",
  "Boolean",
  "Date",
  "SingleSelect",
]);
export type AttributeDataType = z.infer<typeof AttributeDataTypeSchema>;

export const AttributeDefinitionSchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  name: z.string(),
  key: z.string(),
  dataType: AttributeDataTypeSchema,
  isRequired: z.boolean(),
  isFilterable: z.boolean(),
  sortOrder: z.number(),
  itemTypeId: z.string().nullable(),
  createdUtc: z.string(),
});
export type AttributeDefinition = z.infer<typeof AttributeDefinitionSchema>;

export interface CreateAttributeDefinitionInput {
  collectionId: string;
  name: string;
  dataType: AttributeDataType;
  isRequired: boolean;
  isFilterable: boolean;
  itemTypeId?: string | null;
}

export interface UpdateAttributeDefinitionInput {
  collectionId: string;
  attributeDefinitionId: string;
  name: string;
  isRequired: boolean;
  isFilterable: boolean;
  itemTypeId?: string | null;
}
