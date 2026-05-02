import { appConfig } from "./config";

// ---------------------------------------------------------------------------
// Auth token provider
// ---------------------------------------------------------------------------

type TokenProvider = () => Promise<string>;
let _tokenProvider: TokenProvider | null = null;

/** Call this once (inside Auth0Provider context) to enable bearer tokens on all requests. */
export function setTokenProvider(fn: TokenProvider): void {
  _tokenProvider = fn;
}

async function authHeader(): Promise<Record<string, string>> {
  if (!_tokenProvider) return {};
  const token = await _tokenProvider();
  return { Authorization: `Bearer ${token}` };
}

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

export interface Tag {
  id: string;
  name: string;
  key: string;
  createdUtc: string;
}

export interface Location {
  id: string;
  name: string;
  description: string | null;
  createdUtc: string;
}

export interface ItemAttributeValue {
  attributeDefinitionId: string;
  attributeName: string;
  attributeKey: string;
  dataType: AttributeDataType;
  value: string;
}

export interface MediaAsset {
  id: string;
  url: string;
  contentType: string;
  fileName: string;
  sizeBytes: number;
  isPrimary: boolean;
  uploadedUtc: string;
}

export interface ItemSummary {
  id: string;
  collectionId: string;
  name: string;
  description: string | null;
  quantity: number;
  locationId: string | null;
  locationName: string | null;
  tags: string[];
  attributeValueCount: number;
  createdUtc: string;
  updatedUtc: string;
  primaryImageUrl: string | null;
}

export interface PagedItems {
  items: ItemSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ItemDetail {
  id: string;
  collectionId: string;
  name: string;
  description: string | null;
  quantity: number;
  locationId: string | null;
  locationName: string | null;
  tags: Tag[];
  createdUtc: string;
  updatedUtc: string;
  attributeValues: ItemAttributeValue[];
  mediaAssets: MediaAsset[];
}

export interface ItemFilters {
  searchText?: string;
  locationId?: string;
  tagIds?: string[];
  attributeFilters?: Record<string, string>;
  sortBy?: "updatedUtc" | "createdUtc" | "name" | "quantity";
  sortDirection?: "asc" | "desc";
  minQuantity?: number;
  maxQuantity?: number;
  createdAfter?: string;  // ISO date string e.g. "2025-06-01"
  createdBefore?: string;
  hasNoLocation?: boolean;
  hasNoTags?: boolean;
}

export interface ItemEvent {
  id: string;
  itemId: string;
  collectionId: string;
  eventType: string;
  occurredUtc: string;
  occurredBy: string;
  notes: string | null;
}

export interface CollectionSummary {
  collectionId: string;
  totalItems: number;
  totalAttributeDefinitions: number;
  tagsUsed: number;
  locationsUsed: number;
  itemsWithNoLocation: number;
  itemsWithNoTags: number;
  totalMediaAssets: number;
}

export async function listCollections(): Promise<Collection[]> {
  const response = await fetch(`${appConfig.apiBaseUrl}/collections`, {
    headers: await authHeader()
  });

  if (!response.ok) {
    throw new Error("Failed to load collections.");
  }

  return (await response.json()) as Collection[];
}

export async function getCollectionSummary(collectionId: string): Promise<CollectionSummary> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${collectionId}/summary`,
    { headers: await authHeader() }
  );

  if (!response.ok) {
    throw new Error("Failed to load collection summary.");
  }

  return (await response.json()) as CollectionSummary;
}

export interface ItemsByLocation {
  locationId: string | null;
  locationName: string;
  count: number;
}

export interface ItemsByTag {
  tagId: string;
  tagName: string;
  count: number;
}

export interface CollectionReports {
  itemsByLocation: ItemsByLocation[];
  itemsByTag: ItemsByTag[];
}

export async function getCollectionReports(collectionId: string): Promise<CollectionReports> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${collectionId}/reports`,
    { headers: await authHeader() }
  );

  if (!response.ok) {
    throw new Error("Failed to load collection reports.");
  }

  return (await response.json()) as CollectionReports;
}

export interface CollectionActivityEvent {
  eventId: string;
  itemId: string;
  itemName: string;
  eventType: string;
  occurredUtc: string;
  occurredBy: string;
  notes: string | null;
}

export interface PagedCollectionActivity {
  events: CollectionActivityEvent[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listCollectionActivity(
  collectionId: string,
  page: number,
  pageSize: number
): Promise<PagedCollectionActivity> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${collectionId}/activity?page=${page}&pageSize=${pageSize}`,
    { headers: await authHeader() }
  );

  if (!response.ok) {
    throw new Error("Failed to load collection activity.");
  }

  return (await response.json()) as PagedCollectionActivity;
}

export interface SavedView {
  id: string;
  collectionId: string;
  name: string;
  filtersJson: string;
  createdUtc: string;
}

export async function listSavedViews(collectionId: string): Promise<SavedView[]> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${collectionId}/saved-views`,
    { headers: await authHeader() }
  );

  if (!response.ok) throw new Error("Failed to load saved views.");

  return (await response.json()) as SavedView[];
}

export async function createSavedView(
  collectionId: string,
  name: string,
  filtersJson: string
): Promise<SavedView> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${collectionId}/saved-views`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ name, filtersJson })
    }
  );

  if (!response.ok) throw new Error("Failed to save view.");

  return (await response.json()) as SavedView;
}

export async function deleteSavedView(collectionId: string, viewId: string): Promise<void> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${collectionId}/saved-views/${viewId}`,
    { method: "DELETE", headers: await authHeader() }
  );

  if (!response.ok) throw new Error("Failed to delete saved view.");
}

export async function downloadCollectionExport(collectionId: string, fileName: string): Promise<void> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${collectionId}/export`,
    { headers: await authHeader() }
  );

  if (!response.ok) throw new Error("Failed to export collection.");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function createCollection(name: string): Promise<Collection> {
  const response = await fetch(`${appConfig.apiBaseUrl}/collections`, {
    method: "POST",
    headers: {
      ...await authHeader(),
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
    `${appConfig.apiBaseUrl}/collections/${collectionId}/attribute-definitions`,
    { headers: await authHeader() }
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
        ...await authHeader(),
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

export async function listTags(): Promise<Tag[]> {
  const response = await fetch(`${appConfig.apiBaseUrl}/tags`, {
    headers: await authHeader()
  });

  if (!response.ok) {
    throw new Error("Failed to load tags.");
  }

  return (await response.json()) as Tag[];
}

export async function createTag(name: string): Promise<Tag> {
  const response = await fetch(`${appConfig.apiBaseUrl}/tags`, {
    method: "POST",
    headers: {
      ...await authHeader(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name })
  });

  if (!response.ok) {
    throw new Error((await readValidationMessage(response)) ?? "Failed to create tag.");
  }

  return (await response.json()) as Tag;
}

export async function listLocations(): Promise<Location[]> {
  const response = await fetch(`${appConfig.apiBaseUrl}/locations`, {
    headers: await authHeader()
  });

  if (!response.ok) {
    throw new Error("Failed to load locations.");
  }

  return (await response.json()) as Location[];
}

export async function createLocation(input: {
  name: string;
  description: string;
}): Promise<Location> {
  const response = await fetch(`${appConfig.apiBaseUrl}/locations`, {
    method: "POST",
    headers: {
      ...await authHeader(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error(
      (await readValidationMessage(response)) ?? "Failed to create location."
    );
  }

  return (await response.json()) as Location;
}

export async function listItems(
  collectionId: string,
  filters?: Readonly<ItemFilters>,
  page: number = 1,
  pageSize: number = 50
): Promise<PagedItems> {
  const searchParams = new URLSearchParams();

  const searchText = filters?.searchText?.trim();
  if (searchText) {
    searchParams.set("searchText", searchText);
  }

  const locationId = filters?.locationId?.trim();
  if (locationId) {
    searchParams.set("locationId", locationId);
  }

  for (const tagId of filters?.tagIds ?? []) {
    if (tagId.trim().length > 0) {
      searchParams.append("tagIds", tagId);
    }
  }

  for (const [attributeKey, value] of Object.entries(
    filters?.attributeFilters ?? {}
  )) {
    const normalizedKey = attributeKey.trim();
    const normalizedValue = value.trim();

    if (normalizedKey.length > 0 && normalizedValue.length > 0) {
      searchParams.append(
        "attributeFilters",
        `${normalizedKey}=${normalizedValue}`
      );
    }
  }

  if (filters?.sortBy) {
    searchParams.set("sortBy", filters.sortBy);
  }

  if (filters?.sortDirection) {
    searchParams.set("sortDirection", filters.sortDirection);
  }

  if (filters?.minQuantity != null) {
    searchParams.set("minQuantity", String(filters.minQuantity));
  }

  if (filters?.maxQuantity != null) {
    searchParams.set("maxQuantity", String(filters.maxQuantity));
  }

  if (filters?.createdAfter) {
    searchParams.set("createdAfter", filters.createdAfter);
  }

  if (filters?.createdBefore) {
    searchParams.set("createdBefore", filters.createdBefore);
  }

  if (filters?.hasNoLocation) {
    searchParams.set("hasNoLocation", "true");
  }

  if (filters?.hasNoTags) {
    searchParams.set("hasNoTags", "true");
  }

  searchParams.set("page", String(page));
  searchParams.set("pageSize", String(pageSize));

  const queryString = searchParams.toString();
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${collectionId}/items${queryString ? `?${queryString}` : ""}`,
    { headers: await authHeader() }
  );

  if (!response.ok) {
    throw new Error("Failed to load items.");
  }

  return (await response.json()) as PagedItems;
}

export async function getItemDetail(
  collectionId: string,
  itemId: string
): Promise<ItemDetail> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${collectionId}/items/${itemId}`,
    { headers: await authHeader() }
  );

  if (!response.ok) {
    throw new Error("Failed to load item details.");
  }

  return (await response.json()) as ItemDetail;
}

export async function listItemEvents(
  collectionId: string,
  itemId: string
): Promise<ItemEvent[]> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${collectionId}/items/${itemId}/events`,
    { headers: await authHeader() }
  );

  if (!response.ok) {
    throw new Error("Failed to load item history.");
  }

  return (await response.json()) as ItemEvent[];
}

export async function createItem(input: {
  collectionId: string;
  name: string;
  description: string;
  quantity: number;
  locationId: string | null;
  tagIds: string[];
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
        ...await authHeader(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: input.name,
        description: input.description,
        quantity: input.quantity,
        locationId: input.locationId,
        tagIds: input.tagIds,
        attributeValues: input.attributeValues
      })
    }
  );

  if (!response.ok) {
    throw new Error((await readValidationMessage(response)) ?? "Failed to create item.");
  }

  return (await response.json()) as ItemDetail;
}

export async function updateItem(input: {
  collectionId: string;
  itemId: string;
  name: string;
  description: string;
  quantity: number;
  locationId: string | null;
  tagIds: string[];
  attributeValues: Array<{
    attributeDefinitionId: string;
    value: string;
  }>;
}): Promise<ItemDetail> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${input.collectionId}/items/${input.itemId}`,
    {
      method: "PUT",
      headers: {
        ...await authHeader(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: input.name,
        description: input.description,
        quantity: input.quantity,
        locationId: input.locationId,
        tagIds: input.tagIds,
        attributeValues: input.attributeValues
      })
    }
  );

  if (!response.ok) {
    throw new Error((await readValidationMessage(response)) ?? "Failed to update item.");
  }

  return (await response.json()) as ItemDetail;
}

export async function deleteCollection(collectionId: string): Promise<void> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${collectionId}`,
    { method: "DELETE", headers: await authHeader() }
  );

  if (!response.ok) {
    throw new Error("Failed to delete collection.");
  }
}

export async function deleteItem(input: { collectionId: string; itemId: string }): Promise<void> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${input.collectionId}/items/${input.itemId}`,
    { method: "DELETE", headers: await authHeader() }
  );

  if (!response.ok) {
    throw new Error("Failed to delete item.");
  }
}

export async function uploadItemMedia(input: {
  collectionId: string;
  itemId: string;
  file: File;
}): Promise<MediaAsset> {
  const formData = new FormData();
  formData.append("file", input.file);
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${input.collectionId}/items/${input.itemId}/media`,
    { method: "POST", headers: await authHeader(), body: formData }
  );
  if (!response.ok) {
    throw new Error(
      (await readValidationMessage(response)) ?? "Failed to upload image."
    );
  }
  return (await response.json()) as MediaAsset;
}

export async function deleteItemMedia(input: {
  collectionId: string;
  itemId: string;
  mediaAssetId: string;
}): Promise<void> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${input.collectionId}/items/${input.itemId}/media/${input.mediaAssetId}`,
    { method: "DELETE", headers: await authHeader() }
  );
  if (!response.ok) {
    throw new Error("Failed to delete image.");
  }
}

export async function setPrimaryItemMedia(input: {
  collectionId: string;
  itemId: string;
  mediaAssetId: string;
}): Promise<void> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${input.collectionId}/items/${input.itemId}/media/${input.mediaAssetId}/primary`,
    { method: "PUT", headers: await authHeader() }
  );
  if (!response.ok) {
    throw new Error("Failed to set primary image.");
  }
}

export async function deleteTag(tagId: string): Promise<void> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/tags/${tagId}`,
    { method: "DELETE", headers: await authHeader() }
  );

  if (!response.ok) {
    throw new Error("Failed to delete tag.");
  }
}

export async function deleteLocation(locationId: string): Promise<void> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/locations/${locationId}`,
    { method: "DELETE", headers: await authHeader() }
  );

  if (!response.ok) {
    throw new Error("Failed to delete location.");
  }
}

export async function deleteAttributeDefinition(input: {
  collectionId: string;
  attributeDefinitionId: string;
}): Promise<void> {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/collections/${input.collectionId}/attribute-definitions/${input.attributeDefinitionId}`,
    { method: "DELETE", headers: await authHeader() }
  );

  if (!response.ok) {
    throw new Error("Failed to delete attribute definition.");
  }
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
