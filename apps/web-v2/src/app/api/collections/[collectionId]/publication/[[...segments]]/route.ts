import { getAuthClient, isAuthConfigured } from "@/lib/auth";
import { reply } from "@/lib/collections-handler";
import { handlePublication } from "@/lib/publication-handler";
type Context = {
  params: Promise<{ collectionId: string; segments?: string[] }>;
};
async function route(request: Request, context: Context) {
  if (!isAuthConfigured()) return reply({ code: "service_unavailable" }, 503);
  const { collectionId, segments = [] } = await context.params;
  const auth = getAuthClient();
  return handlePublication(request, collectionId, segments, {
    getSession: () => auth.getSession(),
    getToken: async () => (await auth.getAccessToken()).token,
    apiBaseUrl: process.env.API_BASE_URL,
    appBaseUrl: process.env.APP_BASE_URL,
  });
}
export {
  route as GET,
  route as POST,
  route as PUT,
  route as DELETE,
  route as HEAD,
};
