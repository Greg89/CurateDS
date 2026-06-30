import { z } from "zod";
export {
  CollectionActivityEventSchema,
  CollectionReportsSchema,
  CollectionSchema,
  CollectionSummarySchema,
  ItemsByLocationSchema,
  ItemsByTagSchema,
  PagedCollectionActivitySchema,
  type Collection,
  type CollectionActivityEvent,
  type CollectionReports,
  type CollectionSummary,
  type ItemsByLocation,
  type ItemsByTag,
  type PagedCollectionActivity,
} from "@curateds/contracts/collections";
import {
  CollectionReportsSchema,
  CollectionSchema,
  CollectionSummarySchema,
  PagedCollectionActivitySchema,
} from "@curateds/contracts/collections";
import { apiBase, authHeader, readValidationMessage } from "./http";
import type {
  Collection,
  CollectionReports,
  CollectionSummary,
  PagedCollectionActivity,
} from "@curateds/contracts/collections";

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listCollections(): Promise<Collection[]> {
  const response = await fetch(`${apiBase}/collections`, {
    headers: await authHeader(),
  });

  if (!response.ok) {
    throw new Error("Failed to load collections.");
  }

  return z.array(CollectionSchema).parse(await response.json());
}

export async function createCollection(name: string): Promise<Collection> {
  const response = await fetch(`${apiBase}/collections`, {
    method: "POST",
    headers: { ...await authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(
      (await readValidationMessage(response)) ?? "Failed to create collection."
    );
  }

  return CollectionSchema.parse(await response.json());
}

export async function deleteCollection(collectionId: string): Promise<void> {
  const response = await fetch(`${apiBase}/collections/${collectionId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });

  if (!response.ok) {
    throw new Error("Failed to delete collection.");
  }
}

export async function getCollectionSummary(collectionId: string): Promise<CollectionSummary> {
  const response = await fetch(
    `${apiBase}/collections/${collectionId}/summary`,
    { headers: await authHeader() }
  );

  if (!response.ok) {
    throw new Error("Failed to load collection summary.");
  }

  return CollectionSummarySchema.parse(await response.json());
}

export async function getCollectionReports(collectionId: string): Promise<CollectionReports> {
  const response = await fetch(
    `${apiBase}/collections/${collectionId}/reports`,
    { headers: await authHeader() }
  );

  if (!response.ok) {
    throw new Error("Failed to load collection reports.");
  }

  return CollectionReportsSchema.parse(await response.json());
}

export async function listCollectionActivity(
  collectionId: string,
  page: number,
  pageSize: number
): Promise<PagedCollectionActivity> {
  const response = await fetch(
    `${apiBase}/collections/${collectionId}/activity?page=${page}&pageSize=${pageSize}`,
    { headers: await authHeader() }
  );

  if (!response.ok) {
    throw new Error("Failed to load collection activity.");
  }

  return PagedCollectionActivitySchema.parse(await response.json());
}

export async function downloadCollectionExport(
  collectionId: string,
  fileName: string
): Promise<void> {
  const response = await fetch(`${apiBase}/collections/${collectionId}/export`, {
    headers: await authHeader(),
  });

  if (!response.ok) throw new Error("Failed to export collection.");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
