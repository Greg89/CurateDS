import "server-only";
import { z } from "zod";
import { getAuthClient, isAuthConfigured } from "./auth";
import { handleCollections, reply } from "./collections-handler";
import {
  collectionSchema,
  createCollectionSchema,
  createItemSchema,
  itemReceiptSchema,
  recentItemsSchema,
  summarySchema,
} from "./collections";
import { browseParams, itemDetailSchema, itemInputSchema, itemListSchema } from "./items";

export async function collectionRoute(
  request?: Request,
  id?: string,
  resource?: "summary" | "items",
) {
  if (id !== undefined && !z.uuid().safeParse(id).success)
    return reply({ code: "not_found" }, 404);
  if (!isAuthConfigured()) return reply({ code: "service_unavailable" }, 503);
  const auth = getAuthClient();
  const post = request?.method === "POST";
  let itemQuery = "?page=1&pageSize=6&sortBy=createdUtc&sortDirection=desc";
  const browsing = resource === "items" && !post && Boolean(request && new URL(request.url).search);
  if (browsing) {
    try { itemQuery = `?${browseParams(new URL(request!.url).searchParams)}`; }
    catch { return reply({ code: "invalid_request" }, 400); }
  }
  return handleCollections(
    {
      getSession: () => auth.getSession(),
      getToken: async () => (await auth.getAccessToken()).token,
      apiBaseUrl: process.env.API_BASE_URL,
      appBaseUrl: process.env.APP_BASE_URL,
    },
    {
      request,
      path: id
        ? `/collections/${id}/${resource}${resource === "items" && !post ? itemQuery : ""}`
        : "/collections",
      schema:
        resource === "summary"
          ? summarySchema
          : resource === "items"
            ? post
              ? itemDetailSchema
              : browsing ? itemListSchema : recentItemsSchema
            : post
              ? collectionSchema
              : undefined,
      inputSchema:
        resource === "items" ? itemInputSchema : createCollectionSchema,
    },
  );
}
