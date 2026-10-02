import { z } from "zod";
import type { components } from "./generated/api";

export type Collection = components["schemas"]["CollectionResponse"];
export const collectionSchema: z.ZodType<Collection> = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  createdUtc: z.iso.datetime({ offset: true }),
});
export const collectionsSchema = z.array(collectionSchema);
export const collectionQueryKey = ["collections"] as const;

export class CollectionsError extends Error {
  constructor(public readonly status: number) {
    super(
      status === 401
        ? "Your session has ended. Sign in again."
        : status === 403
          ? "You do not have access to these collections."
          : "We couldn't load your collections. Please try again.",
    );
  }
}

export async function fetchCollections({
  signal,
}: { signal?: AbortSignal } = {}): Promise<Collection[]> {
  const response = await fetch("/api/collections", {
    signal,
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) throw new CollectionsError(response.status);
  const parsed = collectionsSchema.safeParse(await response.json());
  if (!parsed.success) throw new CollectionsError(502);
  return parsed.data;
}
