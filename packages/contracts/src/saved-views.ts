import { z } from "zod";

export const SavedViewSchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  name: z.string(),
  filtersJson: z.string(),
  createdUtc: z.string(),
});
export type SavedView = z.infer<typeof SavedViewSchema>;

export const CreateSavedViewRequestSchema = z.object({
  name: z.string(),
  filtersJson: z.string(),
});
export type CreateSavedViewRequest = z.infer<typeof CreateSavedViewRequestSchema>;

export interface CreateSavedViewInput {
  collectionId: string;
  name: string;
  filtersJson: string;
}
