import { appConfig } from "./config";

export interface Collection {
  id: string;
  name: string;
  createdUtc: string;
}

export type AttributeDataType =
  | "Text"
  | "Number"
  | "Decimal"
  | "Boolean"
  | "Date"
  | "SingleSelect";

export interface AttributeDefinition {
  id: string;
  collectionId: string;
  name: string;
  key: string;
  dataType: AttributeDataType;
  isRequired: boolean;
  isFilterable: boolean;
  sortOrder: number;
  createdUtc: string;
}

export async function listCollections(): Promise<Collection[]> {
  const response = await fetch(`${appConfig.apiBaseUrl}/collections`);

  if (!response.ok) {
    throw new Error("Failed to load collections.");
  }

  return (await response.json()) as Collection[];
}

export async function createCollection(name: string): Promise<Collection> {
  const response = await fetch(`${appConfig.apiBaseUrl}/collections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name })
  });

  if (!response.ok) {
    const details = (await response.json().catch(() => null)) as
      | { errors?: Record<string, string[]> }
      | null;

    const message =
      details?.errors?.Name?.[0] ??
      details?.errors?.name?.[0] ??
      "Failed to create collection.";

    throw new Error(message);
  }

  return (await response.json()) as Collection;
}

export async function listAttributeDefinitions(
  collectionId: string
): Promise<AttributeDefinition[]> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${collectionId}/attribute-definitions`
  );

  if (!response.ok) {
    throw new Error("Failed to load attribute definitions.");
  }

  return (await response.json()) as AttributeDefinition[];
}

export async function createAttributeDefinition(input: {
  collectionId: string;
  name: string;
  dataType: AttributeDataType;
  isRequired: boolean;
  isFilterable: boolean;
}): Promise<AttributeDefinition> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${input.collectionId}/attribute-definitions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: input.name,
        dataType: input.dataType,
        isRequired: input.isRequired,
        isFilterable: input.isFilterable
      })
    }
  );

  if (!response.ok) {
    const details = (await response.json().catch(() => null)) as
      | { errors?: Record<string, string[]> }
      | null;

    const message =
      details?.errors?.Name?.[0] ??
      details?.errors?.name?.[0] ??
      "Failed to create attribute definition.";

    throw new Error(message);
  }

  return (await response.json()) as AttributeDefinition;
}
