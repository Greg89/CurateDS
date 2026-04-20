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

export interface ItemAttributeValue {
  attributeDefinitionId: string;
  attributeName: string;
  attributeKey: string;
  dataType: AttributeDataType;
  value: string;
}

export interface ItemSummary {
  id: string;
  collectionId: string;
  name: string;
  description: string | null;
  quantity: number;
  attributeValueCount: number;
  createdUtc: string;
  updatedUtc: string;
}

export interface ItemDetail {
  id: string;
  collectionId: string;
  name: string;
  description: string | null;
  quantity: number;
  createdUtc: string;
  updatedUtc: string;
  attributeValues: ItemAttributeValue[];
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
    throw new Error(
      (await readValidationMessage(response)) ?? "Failed to create collection."
    );
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
    throw new Error(
      (await readValidationMessage(response)) ??
        "Failed to create attribute definition."
    );
  }

  return (await response.json()) as AttributeDefinition;
}

export async function listItems(collectionId: string): Promise<ItemSummary[]> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${collectionId}/items`
  );

  if (!response.ok) {
    throw new Error("Failed to load items.");
  }

  return (await response.json()) as ItemSummary[];
}

export async function getItemDetail(
  collectionId: string,
  itemId: string
): Promise<ItemDetail> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${collectionId}/items/${itemId}`
  );

  if (!response.ok) {
    throw new Error("Failed to load item details.");
  }

  return (await response.json()) as ItemDetail;
}

export async function createItem(input: {
  collectionId: string;
  name: string;
  description: string;
  quantity: number;
  attributeValues: Array<{
    attributeDefinitionId: string;
    value: string;
  }>;
}): Promise<ItemDetail> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${input.collectionId}/items`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: input.name,
        description: input.description,
        quantity: input.quantity,
        attributeValues: input.attributeValues
      })
    }
  );

  if (!response.ok) {
    throw new Error((await readValidationMessage(response)) ?? "Failed to create item.");
  }

  return (await response.json()) as ItemDetail;
}

async function readValidationMessage(response: Response): Promise<string | null> {
  const details = (await response.json().catch(() => null)) as
    | { errors?: Record<string, string[]> }
    | null;

  if (!details?.errors) {
    return null;
  }

  return Object.values(details.errors).flat()[0] ?? null;
}
