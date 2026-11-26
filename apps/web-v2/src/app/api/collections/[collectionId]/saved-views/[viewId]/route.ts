import { insightsRoute } from "@/lib/insights-route";
export async function DELETE(
  request: Request,
  context: { params: Promise<{ collectionId: string; viewId: string }> },
) {
  const { collectionId, viewId } = await context.params;
  return insightsRoute(request, collectionId, "saved-views", viewId);
}
