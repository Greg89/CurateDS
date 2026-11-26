import { z } from "zod";
import { getAuthClient, isAuthConfigured } from "@/lib/auth";
import { handleCollections, reply } from "@/lib/collections-handler";
import { definitionSchema } from "@/lib/items";
import { createFieldInputSchema, fieldInputSchema } from "@/lib/customization";
export const dynamic = "force-dynamic";
async function route(
  request: Request,
  context: { params: Promise<{ collectionId: string; segments?: string[] }> },
) {
  const { collectionId, segments = [] } = await context.params;
  const method = request.method;
  if (
    !z.uuid().safeParse(collectionId).success ||
    !(
      (segments.length === 0 && method === "POST") ||
      (segments.length === 1 &&
        z.uuid().safeParse(segments[0]).success &&
        ["PUT", "DELETE"].includes(method))
    )
  )
    return reply({ code: "not_found" }, 404);
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
      request,
      path: `/collections/${collectionId}/attribute-definitions${segments.length ? `/${segments[0]}` : ""}`,
      schema: definitionSchema.refine(
        (value) =>
          value.collectionId === collectionId &&
          (!segments.length || value.id === segments[0]),
      ),
      inputSchema:
        method === "POST"
          ? createFieldInputSchema
          : method === "PUT"
            ? fieldInputSchema
            : undefined,
    },
  );
}
export const POST = route;
export const PUT = route;
export const DELETE = route;
