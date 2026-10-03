import { z } from "zod";
import { getAuthClient, isAuthConfigured } from "@/lib/auth";
import { handleCollections, reply } from "@/lib/collections-handler";
import { presentationSchema, presentationInputSchema } from "@/lib/collections";
export const dynamic = "force-dynamic";
async function route(
  request: Request,
  context: { params: Promise<{ collectionId: string }> },
) {
  const { collectionId } = await context.params;
  if (!z.uuid().safeParse(collectionId).success)
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
      path: `/collections/${collectionId}/presentation`,
      schema: presentationSchema,
      inputSchema:
        request.method === "PUT" ? presentationInputSchema : undefined,
    },
  );
}
export const GET = route;
export const PUT = route;
