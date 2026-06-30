import { z } from "zod";

export const ItemTypeSchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  createdUtc: z.string(),
});
export type ItemType = z.infer<typeof ItemTypeSchema>;

export const CreateItemTypeRequestSchema = z.object({
  name: z.string(),
});
export type CreateItemTypeRequest = z.infer<typeof CreateItemTypeRequestSchema>;

export interface CreateItemTypeInput {
  collectionId: string;
  name: string;
}
