import { getAuthClient, isAuthConfigured } from "@/lib/auth";
import { handleCollections } from "@/lib/collections-handler";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAuthConfigured()) {
    return Response.json(
      { code: "service_unavailable" },
      {
        status: 503,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
  const auth = getAuthClient();
  return handleCollections({
    getSession: () => auth.getSession(),
    getToken: async () => (await auth.getAccessToken()).token,
    apiBaseUrl: process.env.API_BASE_URL,
  });
}
