import { z } from "zod";
import { apiBase, authHeader, readValidationMessage } from "./http";

// ---------------------------------------------------------------------------
// Schemas & types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listAttributeDefinitions(
  collectionId: string
): Promise<AttributeDefinition[]> {
  const response = await fetch(
    `${apiBase}/collections/${collectionId}/attribute-definitions`,
    { headers: await authHeader() }
  );

  if (!response.ok) throw new Error("Failed to load attribute definitions.");

  return z.array(AttributeDefinitionSchema).parse(await response.json());
}

export async function createAttributeDefinition(input: {
  collectionId: string;
  name: string;
  dataType: AttributeDataType;
  isRequired: boolean;
  isFilterable: boolean;
  itemTypeId?: string | null;
}): Promise<AttributeDefinition> {
  const response = await fetch(
    `${apiBase}/collections/${input.collectionId}/attribute-definitions`,
    {
      method: "POST",
      headers: { ...await authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        dataType: input.dataType,
        isRequired: input.isRequired,
        isFilterable: input.isFilterable,
        itemTypeId: input.itemTypeId ?? null,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      (await readValidationMessage(response)) ?? "Failed to create attribute definition."
    );
  }

  return AttributeDefinitionSchema.parse(await response.json());
}

export async function deleteAttributeDefinition(input: {
  collectionId: string;
  attributeDefinitionId: string;
}): Promise<void> {
  const response = await fetch(
    `${apiBase}/collections/${input.collectionId}/attribute-definitions/${input.attributeDefinitionId}`,
    { method: "DELETE", headers: await authHeader() }
  );

  if (!response.ok) throw new Error("Failed to delete attribute definition.");
}
