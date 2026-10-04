import { z } from "zod";
import type { components } from "./generated/api";

const count = z.number().int().nonnegative();
const timestamp = z.iso.datetime({ offset: true });
const publicItem = z.strictObject({
  token: z.uuid(),
  name: z.string().min(3).max(120),
  description: z.string().max(1000).nullable(),
  descriptionTruncated: z.boolean(),
  imageToken: z.uuid().nullable(),
});
// This allowlist is deliberately independent of the authenticated catalog responses.
export const publicShowcaseSchema = z
  .strictObject({
    version: z.literal(1),
    slug: z
      .string()
      .min(3)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?![\s\S])/),
    revisionToken: z.uuid(),
    asOfUtc: timestamp,
    publishedUtc: timestamp.nullable(),
    title: z.string().min(3).max(100),
    category: z.string().max(100).nullable(),
    description: z.string().max(1000).nullable(),
    layout: z.enum(["gallery", "journal"]),
    color: z.enum(["forest", "clay", "slate"]),
    itemLabel: z.string().min(1).max(40),
    itemsLabel: z.string().min(1).max(40),
    showCover: z.boolean(),
    summary: z
      .strictObject({ totalItems: count, totalMedia: count, tagsInUse: count })
      .optional(),
    highlights: z.array(publicItem).max(6).optional(),
    recent: z.array(publicItem).max(6).optional(),
    growth: z
      .array(z.strictObject({ fromUtc: timestamp, untilUtc: timestamp, count }))
      .length(12)
      .optional(),
    types: z
      .strictObject({
        groups: z
          .array(z.strictObject({ name: z.string().max(50), count }))
          .max(6),
        totalGroups: count,
      })
      .optional(),
  })
  .refine(
    (value) => new TextEncoder().encode(JSON.stringify(value)).length <= 65536,
    "Showcase exceeds its size limit",
  ) satisfies z.ZodType<components["schemas"]["PublicShowcase"]>;
export type PublicShowcase = z.infer<typeof publicShowcaseSchema>;

export const publicationSlugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?![\s\S])/);
export const publicationStatusSchema = z.strictObject({
  state: z.enum(["unpublished", "published", "suspended"]),
  slug: publicationSlugSchema.nullable(),
  generation: count,
  revisionToken: z.uuid().nullable(),
  publishedUtc: timestamp.nullable(),
  suspensionReason: z.string().nullable(),
}) satisfies z.ZodType<components["schemas"]["PublicationStatus"]>;
export const publicationPreviewSchema = z.strictObject({
  token: z.uuid(),
  expiresUtc: timestamp,
  generation: count,
  showcase: publicShowcaseSchema,
  notices: z.array(z.string().max(2000)).max(30),
}) satisfies z.ZodType<components["schemas"]["PublicationPreview"]>;
export type PublicationStatus = z.infer<typeof publicationStatusSchema>;
export type PublicationPreview = z.infer<typeof publicationPreviewSchema>;
export const preparePublicationSchema = z.strictObject({
  slug: publicationSlugSchema,
  omitImages: z.boolean(),
});
export const activatePublicationSchema = z.strictObject({
  candidateToken: z.uuid(),
  expectedGeneration: count,
});

export function suggestPublicationSlug(name: string, randomSuffix: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");
  return slug.length >= 3 ? slug : `collection-${randomSuffix.slice(0, 8)}`;
}
