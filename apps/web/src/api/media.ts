import { z } from "zod";
import { apiBase, authHeader, readValidationMessage } from "./http";

// ---------------------------------------------------------------------------
// Schemas & types
// ---------------------------------------------------------------------------

export const MediaAssetSchema = z.object({
  id: z.string(),
  url: z.string(),
  contentType: z.string(),
  fileName: z.string(),
  sizeBytes: z.number(),
  isPrimary: z.boolean(),
  uploadedUtc: z.string(),
});
export type MediaAsset = z.infer<typeof MediaAssetSchema>;

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function uploadItemMedia(input: {
  collectionId: string;
  itemId: string;
  file: File;
}): Promise<MediaAsset> {
  const formData = new FormData();
  formData.append("file", input.file);
  const response = await fetch(
    `${apiBase}/collections/${input.collectionId}/items/${input.itemId}/media`,
    { method: "POST", headers: await authHeader(), body: formData }
  );

  if (!response.ok) {
    throw new Error(
      (await readValidationMessage(response)) ?? "Failed to upload image."
    );
  }

  return MediaAssetSchema.parse(await response.json());
}

export async function deleteItemMedia(input: {
  collectionId: string;
  itemId: string;
  mediaAssetId: string;
}): Promise<void> {
  const response = await fetch(
    `${apiBase}/collections/${input.collectionId}/items/${input.itemId}/media/${input.mediaAssetId}`,
    { method: "DELETE", headers: await authHeader() }
  );

  if (!response.ok) throw new Error("Failed to delete image.");
}

export async function setPrimaryItemMedia(input: {
  collectionId: string;
  itemId: string;
  mediaAssetId: string;
}): Promise<void> {
  const response = await fetch(
    `${apiBase}/collections/${input.collectionId}/items/${input.itemId}/media/${input.mediaAssetId}/primary`,
    { method: "PUT", headers: await authHeader() }
  );

  if (!response.ok) throw new Error("Failed to set primary image.");
}
