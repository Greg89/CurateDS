import { z } from "zod";
import { apiBase, authHeader, readValidationMessage } from "./http";

// ---------------------------------------------------------------------------
// Schemas & types
// ---------------------------------------------------------------------------

export const ItemTypeSchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  createdUtc: z.string(),
});
export type ItemType = z.infer<typeof ItemTypeSchema>;

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listItemTypes(collectionId: string): Promise<ItemType[]> {
  const response = await fetch(
    `${apiBase}/collections/${collectionId}/item-types`,
    { headers: await authHeader() }
  );

  if (!response.ok) throw new Error("Failed to load item types.");

  return z.array(ItemTypeSchema).parse(await response.json());
}

export async function createItemType(input: {
  collectionId: string;
  name: string;
}): Promise<ItemType> {
  const response = await fetch(
    `${apiBase}/collections/${input.collectionId}/item-types`,
    {
      method: "POST",
      headers: { ...await authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ name: input.name }),
    }
  );

  if (!response.ok) {
    throw new Error(
      (await readValidationMessage(response)) ?? "Failed to create item type."
    );
  }

  return ItemTypeSchema.parse(await response.json());
}

export async function deleteItemType(input: {
  collectionId: string;
  itemTypeId: string;
}): Promise<void> {
  const response = await fetch(
    `${apiBase}/collections/${input.collectionId}/item-types/${input.itemTypeId}`,
    { method: "DELETE", headers: await authHeader() }
  );

  if (!response.ok) throw new Error("Failed to delete item type.");
}
