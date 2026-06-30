import { z } from "zod";
export {
  LocationSchema,
  type Location,
  type CreateLocationInput,
  type UpdateLocationInput,
} from "@curateds/contracts/locations";
import {
  CreateLocationRequestSchema,
  LocationSchema,
  UpdateLocationRequestSchema,
} from "@curateds/contracts/locations";
import { apiBase, authHeader, readValidationMessage } from "./http";
import type { Location } from "@curateds/contracts/locations";

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
  description: string | null;
}): Promise<Location> {
  const response = await fetch(`${apiBase}/locations`, {
    method: "POST",
    headers: { ...await authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(CreateLocationRequestSchema.parse(input)),
  });

  if (!response.ok) {
    throw new Error(
      (await readValidationMessage(response)) ?? "Failed to create location."
    );
  }

  return LocationSchema.parse(await response.json());
}

export async function updateLocation(
  locationId: string,
  input: { name: string; description: string | null }
): Promise<Location> {
  const response = await fetch(`${apiBase}/locations/${locationId}`, {
    method: "PUT",
    headers: { ...await authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(UpdateLocationRequestSchema.parse(input)),
  });

  if (!response.ok) {
    throw new Error(
      (await readValidationMessage(response)) ?? "Failed to update location."
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
