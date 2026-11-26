import { getAuthClient, isAuthConfigured } from "@/lib/auth";
import { reply } from "@/lib/collections-handler";
import { handlePublication } from "@/lib/publication-handler";
import { publicationPreviewSchema } from "@/lib/publication";
import { renderSocialCard } from "@/lib/social-card";
type Context = {
  params: Promise<{ collectionId: string; segments?: string[] }>;
};
async function route(request: Request, context: Context) {
  if (!isAuthConfigured()) return reply({ code: "service_unavailable" }, 503);
  const { collectionId, segments = [] } = await context.params;
  const auth = getAuthClient();
  const deps = {
    getSession: () => auth.getSession(),
    getToken: async () => (await auth.getAccessToken()).token,
    apiBaseUrl: process.env.API_BASE_URL,
    appBaseUrl: process.env.APP_BASE_URL,
  };
  if (
    segments.length === 3 &&
    segments[0] === "previews" &&
    segments[2] === "social" &&
    ["GET", "HEAD"].includes(request.method)
  ) {
    const response = await handlePublication(
      new Request(request.url),
      collectionId,
      segments.slice(0, 2),
      deps,
    );
    if (!response.ok)
      return request.method === "HEAD"
        ? new Response(null, {
            status: response.status,
            headers: response.headers,
          })
        : response;
    const preview = publicationPreviewSchema.parse(await response.json());
    return renderSocialCard(preview.showcase, request.method === "HEAD", true);
  }
  return handlePublication(request, collectionId, segments, deps);
}
export {
  route as GET,
  route as POST,
  route as PUT,
  route as DELETE,
  route as HEAD,
};
