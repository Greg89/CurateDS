import { z } from "zod";
import { apiBase, authHeader, readValidationMessage } from "./http";

// ---------------------------------------------------------------------------
// Schemas & types
// ---------------------------------------------------------------------------

export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdUtc: z.string(),
});
export type Location = z.infer<typeof LocationSchema>;

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listLocations(): Promise<Location[]> {
  const response = await fetch(`${apiBase}/locations`, {
    headers: await authHeader(),
  });

  if (!response.ok) throw new Error("Failed to load locations.");

  return z.array(LocationSchema).parse(await response.json());
}

export async function createLocation(input: {
  name: string;
  description: string;
}): Promise<Location> {
  const response = await fetch(`${apiBase}/locations`, {
    method: "POST",
    headers: { ...await authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(
      (await readValidationMessage(response)) ?? "Failed to create location."
    );
  }

  return LocationSchema.parse(await response.json());
}

export async function deleteLocation(locationId: string): Promise<void> {
  const response = await fetch(`${apiBase}/locations/${locationId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });

  if (!response.ok) throw new Error("Failed to delete location.");
}
