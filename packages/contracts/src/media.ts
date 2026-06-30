import { z } from "zod";

export const MediaAssetSchema = z.object({
  id: z.string(),
  url: z.string(),
  contentType: z.string(),
  fileName: z.string(),
  sizeBytes: z.number(),
  isPrimary: z.boolean(),
  uploadedUtc: z.string(),
});
export type MediaAsset = z.infer<typeof MediaAssetSchema>;

export interface ItemMediaInput {
  collectionId: string;
  itemId: string;
  mediaAssetId: string;
}
