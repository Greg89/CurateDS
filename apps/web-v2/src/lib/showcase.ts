import { z } from "zod";
import { CollectionsError } from "./collections";
import { readJson } from "./items";
import type { components } from "./generated/api";

export const showcaseInputSchema = z.object({
  layout: z.enum(["gallery", "journal"]),
  showGrowth: z.boolean(),
  showTypes: z.boolean(),
}) satisfies z.ZodType<components["schemas"]["UpdateShowcaseSettingsRequest"]>;
export const showcaseSettingsSchema = showcaseInputSchema.extend({
  collectionId: z.uuid(),
}) satisfies z.ZodType<components["schemas"]["ShowcaseSettingsDto"]>;
export type ShowcaseSettings = z.infer<typeof showcaseSettingsSchema>;
export const showcaseKey = (id: string) => ["showcase-settings", id] as const;
export function validateShowcaseSettings(value: unknown, collectionId: string) {
  const data = showcaseSettingsSchema.parse(value);
  if (data.collectionId !== collectionId) throw new CollectionsError(502);
  return data;
}
export async function fetchShowcaseSettings(id: string, signal?: AbortSignal) {
  return validateShowcaseSettings(
    await readJson(
      `/api/collections/${id}/showcase-settings`,
      showcaseSettingsSchema,
      signal,
    ),
    id,
  );
}
