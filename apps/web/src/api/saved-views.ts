import { z } from "zod";
export { SavedViewSchema, type SavedView, type CreateSavedViewInput } from "@curateds/contracts/saved-views";
import { CreateSavedViewRequestSchema, SavedViewSchema } from "@curateds/contracts/saved-views";
import { apiBase, authHeader } from "./http";
import type { SavedView } from "@curateds/contracts/saved-views";

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listSavedViews(collectionId: string): Promise<SavedView[]> {
  const response = await fetch(
    `${apiBase}/collections/${collectionId}/saved-views`,
    { headers: await authHeader() }
  );

  if (!response.ok) throw new Error("Failed to load saved views.");

  return z.array(SavedViewSchema).parse(await response.json());
}

export async function createSavedView(
  collectionId: string,
  name: string,
  filtersJson: string
): Promise<SavedView> {
  const response = await fetch(
    `${apiBase}/collections/${collectionId}/saved-views`,
    {
      method: "POST",
      headers: { ...await authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(CreateSavedViewRequestSchema.parse({ name, filtersJson })),
    }
  );

  if (!response.ok) throw new Error("Failed to save view.");

  return SavedViewSchema.parse(await response.json());
}

export async function deleteSavedView(
  collectionId: string,
  viewId: string
): Promise<void> {
  const response = await fetch(
    `${apiBase}/collections/${collectionId}/saved-views/${viewId}`,
    { method: "DELETE", headers: await authHeader() }
  );

  if (!response.ok) throw new Error("Failed to delete saved view.");
}
