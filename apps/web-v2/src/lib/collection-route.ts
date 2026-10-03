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
        ? `/collections/${id}/${resource}${resource === "items" && !post ? "?page=1&pageSize=6&sortBy=createdUtc&sortDirection=desc" : ""}`
        : "/collections",
      schema:
        resource === "summary"
          ? summarySchema
          : resource === "items"
            ? post
              ? itemReceiptSchema
              : recentItemsSchema
            : post
              ? collectionSchema
              : undefined,
      inputSchema:
        resource === "items" ? createItemSchema : createCollectionSchema,
    },
  );
}
