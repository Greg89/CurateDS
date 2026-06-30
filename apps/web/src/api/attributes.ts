import { z } from "zod";
export {
  AttributeDataTypeSchema,
  AttributeDefinitionSchema,
  type AttributeDataType,
  type AttributeDefinition,
  type CreateAttributeDefinitionInput,
  type UpdateAttributeDefinitionInput,
} from "@curateds/contracts/attributes";
import {
  AttributeDefinitionSchema,
  CreateAttributeDefinitionRequestSchema,
  UpdateAttributeDefinitionRequestSchema,
} from "@curateds/contracts/attributes";
import { apiBase, authHeader, readValidationMessage } from "./http";
import type { AttributeDataType, AttributeDefinition } from "@curateds/contracts/attributes";

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
      body: JSON.stringify(CreateAttributeDefinitionRequestSchema.parse({
        name: input.name,
        dataType: input.dataType,
        isRequired: input.isRequired,
        isFilterable: input.isFilterable,
        itemTypeId: input.itemTypeId ?? null,
      })),
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

export async function updateAttributeDefinition(input: {
  collectionId: string;
  attributeDefinitionId: string;
  name: string;
  isRequired: boolean;
  isFilterable: boolean;
  itemTypeId?: string | null;
}): Promise<AttributeDefinition> {
  const response = await fetch(
    `${apiBase}/collections/${input.collectionId}/attribute-definitions/${input.attributeDefinitionId}`,
    {
      method: "PUT",
      headers: { ...await authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(UpdateAttributeDefinitionRequestSchema.parse({
        name: input.name,
        isRequired: input.isRequired,
        isFilterable: input.isFilterable,
        itemTypeId: input.itemTypeId ?? null,
      })),
    }
  );

  if (!response.ok) {
    throw new Error(
      (await readValidationMessage(response)) ?? "Failed to update attribute definition."
    );
  }

  return AttributeDefinitionSchema.parse(await response.json());
}
