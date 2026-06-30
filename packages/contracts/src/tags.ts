import { z } from "zod";

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  createdUtc: z.string(),
});
export type Tag = z.infer<typeof TagSchema>;

export const CreateTagRequestSchema = z.object({
  name: z.string(),
});
export type CreateTagRequest = z.infer<typeof CreateTagRequestSchema>;

export const UpdateTagRequestSchema = z.object({
  name: z.string(),
});
export type UpdateTagRequest = z.infer<typeof UpdateTagRequestSchema>;
