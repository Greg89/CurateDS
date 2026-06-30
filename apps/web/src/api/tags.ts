import { z } from "zod";
export { TagSchema, type Tag } from "@curateds/contracts/tags";
import { CreateTagRequestSchema, TagSchema, UpdateTagRequestSchema } from "@curateds/contracts/tags";
import { apiBase, authHeader, readValidationMessage } from "./http";
import type { Tag } from "@curateds/contracts/tags";

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listTags(): Promise<Tag[]> {
  const response = await fetch(`${apiBase}/tags`, {
    headers: await authHeader(),
  });

  if (!response.ok) throw new Error("Failed to load tags.");

  return z.array(TagSchema).parse(await response.json());
}

export async function createTag(name: string): Promise<Tag> {
  const response = await fetch(`${apiBase}/tags`, {
    method: "POST",
    headers: { ...await authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(CreateTagRequestSchema.parse({ name })),
  });

  if (!response.ok) {
    throw new Error((await readValidationMessage(response)) ?? "Failed to create tag.");
  }

  return TagSchema.parse(await response.json());
}

export async function updateTag(tagId: string, name: string): Promise<Tag> {
  const response = await fetch(`${apiBase}/tags/${tagId}`, {
    method: "PUT",
    headers: { ...await authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(UpdateTagRequestSchema.parse({ name })),
  });

  if (!response.ok) {
    throw new Error((await readValidationMessage(response)) ?? "Failed to update tag.");
  }

  return TagSchema.parse(await response.json());
}

export async function deleteTag(tagId: string): Promise<void> {
  const response = await fetch(`${apiBase}/tags/${tagId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });

  if (!response.ok) throw new Error("Failed to delete tag.");
}
