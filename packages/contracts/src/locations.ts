import { z } from "zod";

export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdUtc: z.string(),
});
export type Location = z.infer<typeof LocationSchema>;

export interface CreateLocationInput {
  name: string;
  description: string;
}

export interface UpdateLocationInput {
  name: string;
  description: string | null;
}
