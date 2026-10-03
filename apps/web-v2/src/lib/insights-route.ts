import "server-only";
import { z } from "zod";
import { getAuthClient, isAuthConfigured } from "./auth";
import { handleCollections, reply } from "./collections-handler";
import {
  insightsSchema,
  activitySchema,
  savedViewSchema,
  saveViewInputSchema,
} from "./insights";

export async function insightsRoute(
  request: Request,
  id: string,
  resource: "insights" | "activity" | "saved-views",
  viewId?: string,
) {
  if (
    !z.uuid().safeParse(id).success ||
    (viewId && !z.uuid().safeParse(viewId).success)
  )
    return reply({ code: "not_found" }, 404);
  let path = `/collections/${id}/${resource}`;
  let schema: z.ZodType;
  try {
    const params = new URL(request.url).searchParams;
    if (resource === "insights") {
      schema = insightsSchema;
      if (params.has("attributeDefinitionId"))
        path +=
          "?attributeDefinitionId=" +
          z.uuid().parse(params.get("attributeDefinitionId"));
    } else if (resource === "activity") {
      schema = activitySchema;
      const page = z.coerce
        .number()
        .int()
        .min(1)
        .max(100000)
        .parse(params.get("page") || 1);
      path += `?page=${page}&pageSize=8`;
    } else {
      schema =
        request.method === "GET" ? z.array(savedViewSchema) : savedViewSchema;
      if (viewId) path += "/" + viewId;
    }
  } catch {
    return reply({ code: "invalid_request" }, 400);
  }
  if (!isAuthConfigured()) return reply({ code: "service_unavailable" }, 503);
  const auth = getAuthClient();
  return handleCollections(
    {
      getSession: () => auth.getSession(),
      getToken: async () => (await auth.getAccessToken()).token,
      apiBaseUrl: process.env.API_BASE_URL,
      appBaseUrl: process.env.APP_BASE_URL,
    },
    {
      path,
      schema,
      request,
      inputSchema:
        resource === "saved-views" && request.method === "POST"
          ? saveViewInputSchema
          : undefined,
    },
  );
}
