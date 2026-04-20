import { appConfig } from "./config";

export interface Collection {
  id: string;
  name: string;
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
