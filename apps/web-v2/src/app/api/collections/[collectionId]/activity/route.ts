import { insightsRoute } from "@/lib/insights-route";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ collectionId: string }> };
export async function GET(request: Request, context: Context) {
  return insightsRoute(
    request,
    (await context.params).collectionId,
    "activity",
  );
}
