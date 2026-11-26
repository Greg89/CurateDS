import "server-only";
import { z } from "zod";
import { getAuthClient, isAuthConfigured } from "./auth";
import { handleCollections, reply } from "./collections-handler";
import { definitionSchema, itemDetailSchema, itemInputSchema, itemTypeSchema, locationSchema, mediaSchema, tagSchema } from "./items";

export async function itemRoute(request: Request, collectionId: string, segments: string[], option = false) {
  if (!z.uuid().safeParse(collectionId).success) return reply({ code: "not_found" }, 404);
  let path: string;
  let schema: z.ZodType | undefined;
  let inputSchema: z.ZodType | undefined;
  let upload = false;
  let mediaRead = false;
  const method = request.method;
  if (option) {
    const [resource] = segments;
    const schemas: Record<string, z.ZodType> = { "attribute-definitions": z.array(definitionSchema), "item-types": z.array(itemTypeSchema), tags: z.array(tagSchema), locations: z.array(locationSchema) };
    if (method !== "GET" || segments.length !== 1 || !Object.hasOwn(schemas, resource)) return reply({ code: "not_found" }, 404);
    schema = schemas[resource]; path = resource === "tags" || resource === "locations" ? `/${resource}` : `/collections/${collectionId}/${resource}`;
  } else {
    const [itemId, media, assetId, primary] = segments;
    if (!z.uuid().safeParse(itemId).success) return reply({ code: "not_found" }, 404);
    path = `/collections/${collectionId}/items/${itemId}`;
    if (segments.length === 1 && ["GET", "PUT", "DELETE"].includes(method)) {
      schema = itemDetailSchema; if (method === "PUT") inputSchema = itemInputSchema;
    } else if (media === "media" && segments.length === 2 && method === "POST") {
      path += "/media"; schema = mediaSchema; upload = true;
    } else if (media === "media" && z.uuid().safeParse(assetId).success &&
      ((segments.length === 3 && method === "DELETE") || (segments.length === 4 && primary === "primary" && method === "PUT"))) {
      path += `/media/${assetId}${primary ? "/primary" : ""}`;
    } else if (media === "media" && z.uuid().safeParse(assetId).success && segments.length === 4 && primary === "content" && method === "GET") {
      path += `/media/${assetId}/content`; mediaRead = true;
    } else return reply({ code: "not_found" }, 404);
  }
  if (!isAuthConfigured()) return reply({ code: "service_unavailable" }, 503);
  const auth = getAuthClient();
  return handleCollections({ getSession: () => auth.getSession(), getToken: async () => (await auth.getAccessToken()).token,
    apiBaseUrl: process.env.API_BASE_URL, appBaseUrl: process.env.APP_BASE_URL }, { path, schema, request, inputSchema, upload, mediaRead });
}
