import { z } from "zod";

export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdUtc: z.string(),
});
export type Location = z.infer<typeof LocationSchema>;

export const CreateLocationRequestSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
});
export type CreateLocationRequest = z.infer<typeof CreateLocationRequestSchema>;

export const UpdateLocationRequestSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
});
export type UpdateLocationRequest = z.infer<typeof UpdateLocationRequestSchema>;

export interface CreateLocationInput {
  name: string;
  description: string | null;
}

export interface UpdateLocationInput {
  name: string;
  description: string | null;
}
