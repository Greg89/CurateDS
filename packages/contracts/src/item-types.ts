import { z } from "zod";

export const ItemTypeSchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  createdUtc: z.string(),
});
export type ItemType = z.infer<typeof ItemTypeSchema>;

export interface CreateItemTypeInput {
  collectionId: string;
  name: string;
}
